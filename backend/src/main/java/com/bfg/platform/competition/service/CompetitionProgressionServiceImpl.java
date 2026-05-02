package com.bfg.platform.competition.service;

import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationErrorsException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.CompetitionParticipation;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.entity.Entry;
import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationTier;
import com.bfg.platform.competition.mapper.CompetitionProgressionMapper;
import com.bfg.platform.competition.repository.CompetitionParticipationRepository;
import com.bfg.platform.competition.repository.CompetitionFinalStandingRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.EntryRepository;
import com.bfg.platform.competition.repository.QualificationProgressionRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationTierRepository;
import com.bfg.platform.gen.model.AdvanceProgressionRequest;
import com.bfg.platform.gen.model.AdvanceProgressionResponse;
import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionParticipationDto;
import com.bfg.platform.gen.model.CompetitionParticipationDto;
import com.bfg.platform.gen.model.DisciplineProgressionResult;
import com.bfg.platform.gen.model.LaneAssignment;
import com.bfg.platform.gen.model.ParticipationResultRequest;
import com.bfg.platform.gen.model.ParticipationStatus;
import com.bfg.platform.gen.model.ProgressionDataDto;
import com.bfg.platform.gen.model.ProgressionGenerationStatus;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.SetLanesRequest;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CompetitionProgressionServiceImpl implements CompetitionProgressionService {

    private static final List<QualificationEventType> STAGE_ORDER = List.of(
            QualificationEventType.H, QualificationEventType.SF,
            QualificationEventType.FB, QualificationEventType.FA);
    private static final List<Integer> LANE_SEEDING_ORDER = List.of(3, 4, 2, 5, 1, 6, 7);

    private final CompetitionRepository competitionRepository;
    private final CompetitionTimetableEventRepository timetableEventRepository;
    private final EntryRepository entryRepository;
    private final CompetitionParticipationRepository participationRepository;
    private final CompetitionFinalStandingRepository finalStandingRepository;
    private final QualificationTierRepository tierRepository;
    private final QualificationSchemeRepository schemeRepository;
    private final QualificationProgressionRepository progressionRulesRepository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;

    // ═══════════════════════════════════════════════════════════════════════
    //  ADVANCE PROGRESSION
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public AdvanceProgressionResponse advanceProgression(UUID competitionId, AdvanceProgressionRequest request) {
        Competition competition = loadCompetition(competitionId);
        QualificationScheme scheme = schemeRepository.findById(competition.getQualificationSchemeId())
                .orElseThrow(() -> new ValidationErrorsException(
                        List.of("Qualification scheme not found for competition")));

        int laneCount = scheme.getLaneCount() != null ? scheme.getLaneCount() : 6;

        List<QualificationTier> tiers = tierRepository
                .findByQualificationSchemeIdOrderByBoatCountMinAsc(competition.getQualificationSchemeId());

        Set<UUID> disciplineIds;
        if (request.getDisciplineIds() == null || request.getDisciplineIds().isEmpty()) {
            disciplineIds = timetableEventRepository
                    .findDistinctDisciplineIdsByCompetitionId(competitionId);
        } else {
            disciplineIds = new HashSet<>(request.getDisciplineIds());
        }

        List<DisciplineProgressionResult> results = new ArrayList<>();
        for (UUID disciplineId : disciplineIds) {
            results.add(advanceDisciplineProgression(competitionId, disciplineId, tiers, laneCount));
        }

        AdvanceProgressionResponse response = new AdvanceProgressionResponse();
        response.setResults(results);
        return response;
    }

    private DisciplineProgressionResult advanceDisciplineProgression(
            UUID competitionId, UUID disciplineId,
            List<QualificationTier> tiers, int laneCount) {

        DisciplineProgressionResult result = new DisciplineProgressionResult();
        result.setDisciplineId(disciplineId);

        DisciplineDefinition discipline = disciplineDefinitionRepository.findById(disciplineId).orElse(null);
        if (discipline != null) {
            result.setDisciplineName(discipline.getShortName() != null ? discipline.getShortName() : discipline.getName());
        }

        List<Entry> entries = entryRepository.findByCompetitionIdAndDisciplineId(competitionId, disciplineId);
        int entryCount = entries.size();
        result.setEntryCount(entryCount);

        if (entryCount == 0) {
            return skipResult(result, "Няма заявки");
        }

        QualificationTier tier = findMatchingTier(tiers, entryCount);
        if (tier == null) {
            String range = tiers.isEmpty() ? "няма дефинирани нива"
                    : tiers.get(0).getBoatCountMin() + "-" + tiers.get(tiers.size() - 1).getBoatCountMax();
            return skipResult(result, entryCount + " заявки, но обхватът на нивата е " + range);
        }

        List<CompetitionParticipation> existingParticipations = participationRepository
                .findByCompetitionIdAndDisciplineId(competitionId, disciplineId);
        List<CompetitionTimetableEvent> allEvents = timetableEventRepository
                .findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(competitionId, disciplineId);

        if (existingParticipations.isEmpty()) {
            return advanceFirstStage(result, competitionId, disciplineId, entries, tier, allEvents, laneCount);
        }

        QualificationEventType currentStage = determineCurrentStage(existingParticipations, allEvents);
        if (QualificationEventType.FA.equals(currentStage)) {
            return skipResult(result, "Вече е финален етап");
        }

        return advanceToNextStage(result, competitionId, disciplineId, tier, currentStage,
                allEvents, existingParticipations, laneCount);
    }

    private DisciplineProgressionResult advanceFirstStage(
            DisciplineProgressionResult result,
            UUID competitionId, UUID disciplineId,
            List<Entry> entries, QualificationTier tier,
            List<CompetitionTimetableEvent> allEvents, int laneCount) {

        QualificationEventType targetType = tier.getHeatCount() == 0 ? QualificationEventType.FA : QualificationEventType.H;
        int requiredCount = tier.getHeatCount() == 0 ? 1 : tier.getHeatCount();

        List<CompetitionTimetableEvent> targetEvents = filterEventsByType(allEvents, targetType);

        if (targetEvents.size() < requiredCount) {
            String label = eventTypeLabel(targetType);
            return skipResult(result,
                    "Необходими " + requiredCount + " " + label + ", но има само " + targetEvents.size() + " в разписанието");
        }

        List<CompetitionTimetableEvent> selectedEvents = targetEvents.subList(0, requiredCount);

        try {
            distributeEntriesToEvents(entries, selectedEvents, laneCount);
            result.setStatus(ProgressionGenerationStatus.SUCCESS);
            result.setStage(targetType.getValue());
            result.setEventCount(requiredCount);
        } catch (Exception e) {
            result.setStatus(ProgressionGenerationStatus.ERROR);
            result.setReason(e.getMessage());
        }

        return result;
    }

    private DisciplineProgressionResult advanceToNextStage(
            DisciplineProgressionResult result,
            UUID competitionId, UUID disciplineId,
            QualificationTier tier, QualificationEventType currentStage,
            List<CompetitionTimetableEvent> allEvents,
            List<CompetitionParticipation> existingParticipations,
            int laneCount) {

        List<CompetitionTimetableEvent> currentStageEvents = filterEventsByType(allEvents, currentStage);

        Set<UUID> eventIdsWithParticipations = existingParticipations.stream()
                .map(CompetitionParticipation::getCompetitionEventId)
                .collect(Collectors.toSet());
        List<CompetitionTimetableEvent> currentEventsWithParticipations = currentStageEvents.stream()
                .filter(e -> eventIdsWithParticipations.contains(e.getId()))
                .toList();

        boolean allFinished = currentEventsWithParticipations.stream()
                .allMatch(e -> CompetitionEventStatus.OFFICIAL_RESULTS.equals(e.getEventStatus()));
        if (!allFinished) {
            return skipResult(result,
                    "Не всички " + eventTypeLabel(currentStage) + " имат официални резултати");
        }

        List<QualificationProgression> rules = progressionRulesRepository
                .findByQualificationTierIdAndSourceEvent(tier.getId(), currentStage);
        if (rules.isEmpty()) {
            return skipResult(result,
                    "Няма дефинирани правила за прогресия от " + eventTypeLabel(currentStage));
        }

        QualificationProgression nextRule = findNextRule(currentStage, rules);
        if (nextRule == null) {
            return skipResult(result,
                    "Няма валидна следваща дестинация от " + eventTypeLabel(currentStage));
        }

        QualificationEventType destType = nextRule.getDestEvent();
        int requiredCount = getRequiredEventCount(tier, destType);
        if (requiredCount == 0) {
            return skipResult(result,
                    "Нивото не дефинира събития от тип " + eventTypeLabel(destType));
        }

        List<CompetitionTimetableEvent> destEvents = filterEventsByType(allEvents, destType);
        if (destEvents.size() < requiredCount) {
            return skipResult(result,
                    "Необходими " + requiredCount + " " + eventTypeLabel(destType) +
                            ", но има само " + destEvents.size() + " в разписанието");
        }

        List<CompetitionTimetableEvent> selectedDestEvents = destEvents.subList(0, requiredCount);

        List<CompetitionParticipation> currentStageParticipations = existingParticipations.stream()
                .filter(p -> currentEventsWithParticipations.stream()
                        .anyMatch(e -> e.getId().equals(p.getCompetitionEventId())))
                .toList();

        List<QualifiedEntry> qualifiedEntries = getQualifiedEntries(
                currentEventsWithParticipations, nextRule, currentStageParticipations);

        if (qualifiedEntries.isEmpty()) {
            return skipResult(result, "Няма класирани участници за следващия етап");
        }

        try {
            distributeEntriesSeeded(qualifiedEntries, selectedDestEvents, laneCount);
            result.setStatus(ProgressionGenerationStatus.SUCCESS);
            result.setFromStage(currentStage.getValue());
            result.setStage(destType.getValue());
            result.setEventCount(requiredCount);
            result.setEntryCount(qualifiedEntries.size());
        } catch (Exception e) {
            result.setStatus(ProgressionGenerationStatus.ERROR);
            result.setReason(e.getMessage());
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SET LANES
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public ProgressionDataDto setLanes(UUID competitionId, SetLanesRequest request) {
        Competition competition = loadCompetition(competitionId);

        QualificationScheme scheme = schemeRepository.findById(competition.getQualificationSchemeId())
                .orElseThrow(() -> new ValidationErrorsException(
                        List.of("Qualification scheme not found for competition")));
        int maxLanes = scheme.getLaneCount() != null ? scheme.getLaneCount() : 6;

        UUID disciplineId = request.getDisciplineId();
        QualificationEventType eventType = request.getQualificationEventType();

        List<CompetitionTimetableEvent> events = timetableEventRepository
                .findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(competitionId, disciplineId)
                .stream()
                .filter(e -> eventType.equals(e.getQualificationEventType()))
                .toList();

        if (events.isEmpty()) {
            throw new ValidationErrorsException(List.of(
                    "No " + eventType + " events found for discipline " + disciplineId));
        }

        // Load all participations across these events once
        List<CompetitionParticipation> allParticipations = events.stream()
                .flatMap(e -> participationRepository.findByCompetitionEventIdOrderByLaneAsc(e.getId()).stream())
                .toList();

        boolean hasResults = allParticipations.stream().anyMatch(p -> p.getFinishTimeMs() != null);
        if (hasResults) {
            throw new ValidationErrorsException(List.of(
                    "Не може да се променят коридорите — вече има записани резултати в този етап"));
        }

        List<String> errors = new ArrayList<>();
        List<LaneAssignment> assignments = request.getAssignments();

        int maxEventIndex = events.size() - 1;
        for (LaneAssignment a : assignments) {
            if (a.getEventIndex() > maxEventIndex) {
                errors.add("Event index " + a.getEventIndex() + " is out of range (0-" + maxEventIndex + ")");
            }
        }

        Set<String> entryEventKeys = new HashSet<>();
        for (LaneAssignment a : assignments) {
            String key = a.getEntryId() + ":" + a.getEventIndex();
            if (!entryEventKeys.add(key)) {
                errors.add("Duplicate entry " + a.getEntryId() + " in event index " + a.getEventIndex());
            }
        }

        Set<String> laneEventKeys = new HashSet<>();
        for (LaneAssignment a : assignments) {
            String key = a.getLane() + ":" + a.getEventIndex();
            if (!laneEventKeys.add(key)) {
                errors.add("Duplicate lane " + a.getLane() + " in event index " + a.getEventIndex());
            }
            if (a.getLane() > maxLanes) {
                errors.add("Коридор " + a.getLane() + " надвишава максималния брой коридори (" + maxLanes + ")");
            }
        }

        Map<UUID, CompetitionParticipation> participationByEntryId = allParticipations.stream()
                .filter(p -> p.getFinishTimeMs() == null)
                .collect(Collectors.toMap(CompetitionParticipation::getEntryId, p -> p));

        Set<UUID> submittedEntryIds = assignments.stream()
                .map(LaneAssignment::getEntryId)
                .collect(Collectors.toSet());

        if (!participationByEntryId.isEmpty() && !submittedEntryIds.equals(participationByEntryId.keySet())) {
            Set<UUID> missing = new HashSet<>(participationByEntryId.keySet());
            missing.removeAll(submittedEntryIds);
            Set<UUID> extra = new HashSet<>(submittedEntryIds);
            extra.removeAll(participationByEntryId.keySet());
            if (!missing.isEmpty()) {
                errors.add("Missing entries: " + missing.size() + " entries not included in assignments");
            }
            if (!extra.isEmpty()) {
                errors.add("Unknown entries: " + extra.size() + " entries not found in existing participations");
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationErrorsException(errors);
        }

        // Update each participation in place — only change event and lane
        for (LaneAssignment a : assignments) {
            CompetitionParticipation participation = participationByEntryId.get(a.getEntryId());
            UUID targetEventId = events.get(a.getEventIndex()).getId();

            participation.setCompetitionEventId(targetEventId);
            participation.setLane(a.getLane());
        }

        participationRepository.saveAll(participationByEntryId.values());

        ProgressionDataDto dto = new ProgressionDataDto();
        dto.setParticipations(
                participationRepository.findByCompetitionId(competitionId).stream()
                        .map(CompetitionProgressionMapper::toDto)
                        .toList());
        return dto;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  RECORD RESULTS
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public ProgressionDataDto recordResults(UUID eventId, List<ParticipationResultRequest> results, CompetitionEventStatus eventStatus) {
        if (eventStatus != CompetitionEventStatus.UNOFFICIAL_RESULTS && eventStatus != CompetitionEventStatus.OFFICIAL_RESULTS) {
            throw new ValidationException("Event status must be UNOFFICIAL_RESULTS or OFFICIAL_RESULTS");
        }

        CompetitionTimetableEvent event = timetableEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("CompetitionTimetableEvent", eventId));

        CompetitionEventStatus previousStatus = event.getEventStatus();

        Map<UUID, ParticipationResultRequest> resultMap = results.stream()
                .collect(Collectors.toMap(ParticipationResultRequest::getParticipationId, r -> r));

        List<CompetitionParticipation> participations = participationRepository
                .findByCompetitionEventIdOrderByLaneAsc(eventId);

        boolean hasTimeChanges = detectTimeChanges(participations, resultMap);

        List<String> errors = new ArrayList<>();
        for (CompetitionParticipation p : participations) {
            applyResult(p, resultMap.get(p.getId()), errors);
        }

        if (!errors.isEmpty()) {
            throw new ValidationErrorsException(errors);
        }

        if (previousStatus == CompetitionEventStatus.OFFICIAL_RESULTS
                && eventStatus == CompetitionEventStatus.UNOFFICIAL_RESULTS) {
            validateNoNextStageResults(event);
            deleteNextStageParticipations(event);
            finalStandingRepository.deleteByCompetitionIdAndDisciplineId(event.getCompetitionId(), event.getDisciplineId());
        } else if (hasTimeChanges && previousStatus == CompetitionEventStatus.OFFICIAL_RESULTS) {
            validateNoNextStageResults(event);
            deleteNextStageParticipations(event);
            finalStandingRepository.deleteByCompetitionIdAndDisciplineId(event.getCompetitionId(), event.getDisciplineId());
        } else if (hasTimeChanges) {
            validateNoNextStageResults(event);
            finalStandingRepository.deleteByCompetitionIdAndDisciplineId(event.getCompetitionId(), event.getDisciplineId());
        }

        computePlaces(participations);
        List<CompetitionParticipation> saved = participationRepository.saveAll(participations);

        event.setEventStatus(eventStatus);
        timetableEventRepository.save(event);

        return toProgressionDataDto(saved.stream().map(CompetitionProgressionMapper::toDto).toList());
    }

    private boolean detectTimeChanges(List<CompetitionParticipation> participations, Map<UUID, ParticipationResultRequest> resultMap) {
        for (CompetitionParticipation p : participations) {
            ParticipationResultRequest newResult = resultMap.get(p.getId());
            if (newResult == null) continue;
            Integer oldTime = p.getFinishTimeMs();
            Integer newTime = newResult.getFinishTimeMs();
            if (oldTime == null && newTime == null) continue;
            if (oldTime == null || !oldTime.equals(newTime)) return true;
        }
        return false;
    }

    private void validateNoNextStageResults(CompetitionTimetableEvent sourceEvent) {
        QualificationEventType currentStage = sourceEvent.getQualificationEventType();
        if (currentStage == null) return;

        UUID competitionId = sourceEvent.getCompetitionId();
        UUID disciplineId = sourceEvent.getDisciplineId();

        int currentIndex = STAGE_ORDER.indexOf(currentStage);

        List<CompetitionTimetableEvent> allDisciplineEvents = timetableEventRepository
                .findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(competitionId, disciplineId);

        boolean anyDownstreamHasResults = allDisciplineEvents.stream()
                .filter(e -> e.getQualificationEventType() != null)
                .filter(e -> STAGE_ORDER.indexOf(e.getQualificationEventType()) > currentIndex)
                .anyMatch(e -> e.getEventStatus() == CompetitionEventStatus.UNOFFICIAL_RESULTS
                        || e.getEventStatus() == CompetitionEventStatus.OFFICIAL_RESULTS);

        if (anyDownstreamHasResults) {
            throw new ValidationException(
                    "Не може да се променят резултатите — следващият етап вече има резултати");
        }
    }

    private void deleteNextStageParticipations(CompetitionTimetableEvent sourceEvent) {
        QualificationEventType currentStage = sourceEvent.getQualificationEventType();
        if (currentStage == null) return;

        UUID competitionId = sourceEvent.getCompetitionId();
        UUID disciplineId = sourceEvent.getDisciplineId();

        int currentIndex = STAGE_ORDER.indexOf(currentStage);

        List<CompetitionTimetableEvent> allDisciplineEvents = timetableEventRepository
                .findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(competitionId, disciplineId);

        for (CompetitionTimetableEvent event : allDisciplineEvents) {
            if (event.getQualificationEventType() == null) continue;
            int eventIndex = STAGE_ORDER.indexOf(event.getQualificationEventType());
            if (eventIndex > currentIndex) {
                participationRepository.deleteByCompetitionEventId(event.getId());
                event.setEventStatus(CompetitionEventStatus.SCHEDULED);
                timetableEventRepository.save(event);
            }
        }
    }

    private void applyResult(CompetitionParticipation p, ParticipationResultRequest result, List<String> errors) {
        if (result == null) {
            errors.add("Missing result for participation " + p.getId());
            return;
        }
        ParticipationStatus status = result.getFinishStatus();
        if (status == null) {
            errors.add("Finish status is required for participation " + p.getId());
            return;
        }
        if (status != ParticipationStatus.FINISHED && status != ParticipationStatus.DNS
                && status != ParticipationStatus.DNF && status != ParticipationStatus.DSQ) {
            errors.add("Status must be FINISHED, DNS, DNF, or DSQ for participation " + p.getId());
            return;
        }
        if (status == ParticipationStatus.FINISHED && result.getFinishTimeMs() == null) {
            errors.add("Finish time is required when status is FINISHED for participation " + p.getId());
            return;
        }
        p.setParticipationStatus(status);
        p.setFinishTimeMs(result.getFinishTimeMs());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  READ-ONLY QUERIES
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public ProgressionDataDto getProgressionData(UUID competitionId) {
        List<CompetitionParticipationDto> participations = participationRepository.findByCompetitionId(competitionId).stream()
                .map(CompetitionProgressionMapper::toDto)
                .toList();
        return toProgressionDataDto(participations);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgressionDataDto getEventParticipations(UUID eventId) {
        List<CompetitionParticipationDto> participations = participationRepository.findByCompetitionEventIdOrderByLaneAsc(eventId).stream()
                .map(CompetitionProgressionMapper::toDto)
                .toList();
        return toProgressionDataDto(participations);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  UPDATE PARTICIPATION STATUS
    // ═══════════════════════════════════════════════════════════════════════

    private static final Map<ParticipationStatus, Set<ParticipationStatus>> ALLOWED_PARTICIPATION_TRANSITIONS = Map.of(
            ParticipationStatus.REGISTERED, Set.of(ParticipationStatus.CHECKED_IN),
            ParticipationStatus.CHECKED_IN, Set.of(ParticipationStatus.REGISTERED)
    );

    @Override
    @Transactional
    public CompetitionParticipationDto updateParticipationStatus(UUID participationUuid, ParticipationStatus newStatus) {
        CompetitionParticipation participation = participationRepository.findById(participationUuid)
                .orElseThrow(() -> new ResourceNotFoundException("CompetitionParticipation", participationUuid));

        ParticipationStatus current = participation.getParticipationStatus();
        if (current == null) {
            current = ParticipationStatus.REGISTERED;
        }

        Set<ParticipationStatus> allowed = ALLOWED_PARTICIPATION_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new ValidationErrorsException(List.of(
                    "Невалиден преход: " + current.getValue() + " → " + newStatus.getValue()));
        }

        CompetitionTimetableEvent event = timetableEventRepository.findById(participation.getCompetitionEventId())
                .orElseThrow(() -> new ResourceNotFoundException("CompetitionTimetableEvent", participation.getCompetitionEventId()));
        if (CompetitionEventStatus.OFFICIAL_RESULTS.equals(event.getEventStatus())) {
            throw new ValidationErrorsException(List.of(
                    "Не може да се промени статус на участник — събитието е с официални резултати"));
        }

        if (newStatus == ParticipationStatus.FINISHED && participation.getFinishTimeMs() == null) {
            throw new ValidationErrorsException(List.of(
                    "Не може да се зададе FINISHED без записано време"));
        }

        boolean movingBackward = newStatus == ParticipationStatus.REGISTERED
                || newStatus == ParticipationStatus.CHECKED_IN;
        if (movingBackward && participation.getFinishTimeMs() != null) {
            participation.setFinishTimeMs(null);
            participation.setPlace(null);
        }

        participation.setParticipationStatus(newStatus);
        CompetitionParticipation saved = participationRepository.save(participation);
        return CompetitionProgressionMapper.toDto(saved);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private ProgressionDataDto toProgressionDataDto(List<CompetitionParticipationDto> participations) {
        ProgressionDataDto dto = new ProgressionDataDto();
        dto.setParticipations(participations);
        return dto;
    }

    private Competition loadCompetition(UUID competitionId) {
        return competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));
    }

    private QualificationTier findMatchingTier(List<QualificationTier> tiers, int entryCount) {
        for (QualificationTier tier : tiers) {
            if (entryCount >= tier.getBoatCountMin() && entryCount <= tier.getBoatCountMax()) {
                return tier;
            }
        }
        return null;
    }

    private List<CompetitionTimetableEvent> filterEventsByType(
            List<CompetitionTimetableEvent> events, QualificationEventType eventType) {
        return events.stream()
                .filter(e -> eventType.equals(e.getQualificationEventType()))
                .toList();
    }

    private QualificationEventType determineCurrentStage(
            List<CompetitionParticipation> participations,
            List<CompetitionTimetableEvent> allEvents) {

        Map<UUID, QualificationEventType> eventTypeMap = allEvents.stream()
                .collect(Collectors.toMap(CompetitionTimetableEvent::getId,
                        CompetitionTimetableEvent::getQualificationEventType));

        Set<QualificationEventType> stagesWithParticipations = participations.stream()
                .map(p -> eventTypeMap.get(p.getCompetitionEventId()))
                .collect(Collectors.toSet());

        for (int i = STAGE_ORDER.size() - 1; i >= 0; i--) {
            if (stagesWithParticipations.contains(STAGE_ORDER.get(i))) {
                return STAGE_ORDER.get(i);
            }
        }

        return QualificationEventType.H;
    }

    private QualificationProgression findNextRule(QualificationEventType currentStage, List<QualificationProgression> rules) {
        int currentIndex = STAGE_ORDER.indexOf(currentStage);
        QualificationProgression best = null;
        int bestIndex = Integer.MAX_VALUE;

        for (QualificationProgression rule : rules) {
            int destIndex = STAGE_ORDER.indexOf(rule.getDestEvent());
            if (destIndex > currentIndex && destIndex < bestIndex) {
                best = rule;
                bestIndex = destIndex;
            }
        }
        return best;
    }

    private int getRequiredEventCount(QualificationTier tier, QualificationEventType eventType) {
        return switch (eventType) {
            case H -> tier.getHeatCount();
            case SF -> tier.getSemiFinalCount();
            case FB -> tier.getFinalBCount();
            case FA -> tier.getFinalACount();
        };
    }

    private record QualifiedEntry(UUID entryId, int rank, Integer timeMs) {}

    private List<QualifiedEntry> getQualifiedEntries(
            List<CompetitionTimetableEvent> sourceEvents,
            QualificationProgression rule,
            List<CompetitionParticipation> participations) {

        Map<UUID, List<CompetitionParticipation>> byEvent = participations.stream()
                .collect(Collectors.groupingBy(CompetitionParticipation::getCompetitionEventId));

        List<QualifiedEntry> qualifiedByPosition = new ArrayList<>();
        List<CompetitionParticipation> remaining = new ArrayList<>();
        int globalRank = 0;

        for (CompetitionTimetableEvent event : sourceEvents) {
            List<CompetitionParticipation> eventParticipations = byEvent.getOrDefault(event.getId(), List.of());
            List<CompetitionParticipation> okFinishes = eventParticipations.stream()
                    .filter(p -> ParticipationStatus.FINISHED.equals(p.getParticipationStatus()) && p.getPlace() != null)
                    .sorted(Comparator.comparing(CompetitionParticipation::getPlace))
                    .toList();

            for (CompetitionParticipation p : okFinishes) {
                if (p.getPlace() <= rule.getQualifyByPosition()) {
                    qualifiedByPosition.add(new QualifiedEntry(p.getEntryId(), ++globalRank, p.getFinishTimeMs()));
                } else {
                    remaining.add(p);
                }
            }
        }

        List<QualifiedEntry> result = new ArrayList<>(qualifiedByPosition);

        if (rule.getQualifyByTime() > 0 && !remaining.isEmpty()) {
            remaining.sort(Comparator.comparing(CompetitionParticipation::getFinishTimeMs));
            int toTake = Math.min(rule.getQualifyByTime(), remaining.size());
            for (int i = 0; i < toTake; i++) {
                CompetitionParticipation p = remaining.get(i);
                result.add(new QualifiedEntry(p.getEntryId(), ++globalRank, p.getFinishTimeMs()));
            }
        }

        return result;
    }

    private void distributeEntriesToEvents(
            List<Entry> entries, List<CompetitionTimetableEvent> events, int laneCount) {

        List<Entry> shuffled = new ArrayList<>(entries);
        Collections.shuffle(shuffled);

        int eventCount = events.size();

        for (int i = 0; i < shuffled.size(); i++) {
            int eventIndex = i % eventCount;
            int laneInEvent = (i / eventCount) + 1;

            if (laneInEvent > laneCount) {
                laneInEvent = ((i / eventCount) % laneCount) + 1;
            }

            CompetitionParticipation participation = CompetitionParticipation.builder()
                    .competitionEventId(events.get(eventIndex).getId())
                    .entryId(shuffled.get(i).getId())
                    .lane(laneInEvent)
                    .build();

            participationRepository.save(participation);
        }
    }

    private void distributeEntriesSeeded(
            List<QualifiedEntry> entries, List<CompetitionTimetableEvent> events, int laneCount) {

        entries.sort(Comparator.comparingInt(QualifiedEntry::rank));

        int eventCount = events.size();
        List<List<QualifiedEntry>> eventBuckets = new ArrayList<>();
        for (int i = 0; i < eventCount; i++) {
            eventBuckets.add(new ArrayList<>());
        }

        for (int i = 0; i < entries.size(); i++) {
            int eventIndex = i % eventCount;
            eventBuckets.get(eventIndex).add(entries.get(i));
        }

        List<Integer> seedingOrder = LANE_SEEDING_ORDER.stream()
                .filter(lane -> lane <= laneCount)
                .toList();

        for (int eventIndex = 0; eventIndex < eventCount; eventIndex++) {
            List<QualifiedEntry> bucket = eventBuckets.get(eventIndex);
            CompetitionTimetableEvent event = events.get(eventIndex);

            for (int i = 0; i < bucket.size(); i++) {
                int lane;
                if (i < seedingOrder.size()) {
                    lane = seedingOrder.get(i);
                } else {
                    lane = (i % laneCount) + 1;
                }

                CompetitionParticipation participation = CompetitionParticipation.builder()
                        .competitionEventId(event.getId())
                        .entryId(bucket.get(i).entryId())
                        .lane(lane)
                        .build();

                participationRepository.save(participation);
            }
        }
    }

    private void computePlaces(List<CompetitionParticipation> participations) {
        List<CompetitionParticipation> finished = participations.stream()
                .filter(p -> ParticipationStatus.FINISHED.equals(p.getParticipationStatus()) && p.getFinishTimeMs() != null)
                .sorted(Comparator.comparing(CompetitionParticipation::getFinishTimeMs))
                .toList();

        int place = 1;
        for (int i = 0; i < finished.size(); i++) {
            if (i > 0 && finished.get(i).getFinishTimeMs().equals(finished.get(i - 1).getFinishTimeMs())) {
                finished.get(i).setPlace(finished.get(i - 1).getPlace());
            } else {
                finished.get(i).setPlace(place);
            }
            place++;
        }

        for (CompetitionParticipation p : participations) {
            if (!ParticipationStatus.FINISHED.equals(p.getParticipationStatus())) {
                p.setPlace(null);
            }
        }
    }

    private DisciplineProgressionResult skipResult(DisciplineProgressionResult result, String reason) {
        result.setStatus(ProgressionGenerationStatus.SKIPPED);
        result.setReason(reason);
        return result;
    }

    private String eventTypeLabel(QualificationEventType type) {
        return switch (type) {
            case H -> "серии";
            case SF -> "полуфинали";
            case FB -> "финал Б";
            case FA -> "финал А";
        };
    }
}
