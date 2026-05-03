package com.bfg.platform.competition.service;

import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.competition.entity.CompetitionFinalStanding;
import com.bfg.platform.competition.entity.CompetitionParticipation;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.entity.ScoringRule;
import com.bfg.platform.competition.entity.ScoringScheme;
import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.mapper.CompetitionProgressionMapper;
import com.bfg.platform.competition.repository.CompetitionFinalStandingRepository;
import com.bfg.platform.competition.repository.CompetitionParticipationRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.ScoringRuleRepository;
import com.bfg.platform.competition.repository.ScoringSchemeBoatCoefficientRepository;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionFinalStandingDto;
import com.bfg.platform.gen.model.DisciplineStandingResult;
import com.bfg.platform.gen.model.ParticipationStatus;
import com.bfg.platform.gen.model.ProgressionGenerationStatus;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.ScoringType;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CompetitionFinalStandingServiceImpl implements CompetitionFinalStandingService {

    private static final List<QualificationEventType> PHASE_PRIORITY = List.of(
            QualificationEventType.FA, QualificationEventType.FB, QualificationEventType.SF, QualificationEventType.H
    );

    private final CompetitionFinalStandingRepository standingRepository;
    private final CompetitionRepository competitionRepository;
    private final CompetitionTimetableEventRepository timetableEventRepository;
    private final CompetitionParticipationRepository participationRepository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final ScoringSchemeRepository scoringSchemeRepository;
    private final ScoringRuleRepository scoringRuleRepository;
    private final ScoringSchemeBoatCoefficientRepository boatCoefficientRepository;

    @Override
    @Transactional
    public List<DisciplineStandingResult> computeStandings(UUID competitionId, List<UUID> disciplineIds) {
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));

        List<DisciplineStandingResult> results = new ArrayList<>();

        for (UUID disciplineId : disciplineIds) {
            DisciplineStandingResult result = new DisciplineStandingResult();
            result.setDisciplineId(disciplineId);

            DisciplineDefinition discipline = disciplineDefinitionRepository.findById(disciplineId).orElse(null);
            if (discipline == null) {
                result.setDisciplineName("Unknown");
                result.setStatus(ProgressionGenerationStatus.ERROR);
                result.setReason("Дисциплината не е намерена");
                results.add(result);
                continue;
            }

            result.setDisciplineName(discipline.getShortName());

            try {
                List<CompetitionTimetableEvent> events = timetableEventRepository
                        .findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(competitionId, disciplineId);

                if (events.isEmpty()) {
                    result.setStatus(ProgressionGenerationStatus.SKIPPED);
                    result.setReason("Няма събития за дисциплина: " + discipline.getShortName());
                    results.add(result);
                    continue;
                }

                List<String> nonOfficialEvents = events.stream()
                        .filter(e -> e.getEventStatus() != CompetitionEventStatus.OFFICIAL_RESULTS)
                        .map(e -> e.getQualificationEventType().name() + " (" + e.getEventStatus() + ")")
                        .toList();

                if (!nonOfficialEvents.isEmpty()) {
                    result.setStatus(ProgressionGenerationStatus.SKIPPED);
                    result.setReason("Не всички фази са с официални резултати: " + String.join(", ", nonOfficialEvents));
                    results.add(result);
                    continue;
                }

                List<CompetitionFinalStanding> standings = computeForDiscipline(competition, discipline, events);
                standingRepository.deleteByCompetitionIdAndDisciplineId(competitionId, disciplineId);
                standingRepository.flush();
                standingRepository.saveAll(standings);

                result.setStatus(ProgressionGenerationStatus.SUCCESS);
                results.add(result);
            } catch (Exception e) {
                result.setStatus(ProgressionGenerationStatus.ERROR);
                result.setReason(e.getMessage());
                results.add(result);
            }
        }

        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionFinalStandingDto> getStandings(UUID competitionId, UUID disciplineId) {
        if (!competitionRepository.existsById(competitionId)) {
            throw new ResourceNotFoundException("Competition", competitionId);
        }

        List<CompetitionFinalStanding> standings;
        if (disciplineId != null) {
            standings = standingRepository.findByCompetitionIdAndDisciplineId(competitionId, disciplineId);
        } else {
            standings = standingRepository.findByCompetitionId(competitionId);
        }

        return standings.stream()
                .map(CompetitionProgressionMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public void deleteStandings(UUID competitionId, List<UUID> disciplineIds) {
        if (!competitionRepository.existsById(competitionId)) {
            throw new ResourceNotFoundException("Competition", competitionId);
        }
        standingRepository.deleteByCompetitionIdAndDisciplineIdIn(competitionId, disciplineIds);
    }

    private List<CompetitionFinalStanding> computeForDiscipline(
            Competition competition, DisciplineDefinition discipline, List<CompetitionTimetableEvent> events) {

        Map<QualificationEventType, List<CompetitionTimetableEvent>> eventsByPhase = events.stream()
                .collect(Collectors.groupingBy(CompetitionTimetableEvent::getQualificationEventType));

        List<CompetitionParticipation> allParticipations = participationRepository
                .findByCompetitionIdAndDisciplineId(competition.getId(), discipline.getId());

        Map<UUID, List<CompetitionParticipation>> participationsByEntry = allParticipations.stream()
                .collect(Collectors.groupingBy(CompetitionParticipation::getEntryId));

        Map<UUID, QualificationEventType> eventPhaseMap = events.stream()
                .collect(Collectors.toMap(CompetitionTimetableEvent::getId, CompetitionTimetableEvent::getQualificationEventType));

        // Build ranked entries grouped by phase depth
        List<RankedEntry> rankedEntries = new ArrayList<>();

        for (Map.Entry<UUID, List<CompetitionParticipation>> entry : participationsByEntry.entrySet()) {
            UUID entryId = entry.getKey();
            List<CompetitionParticipation> entryParticipations = entry.getValue();

            // Find deepest phase participation
            CompetitionParticipation deepest = null;
            int deepestPriority = Integer.MAX_VALUE;

            for (CompetitionParticipation p : entryParticipations) {
                QualificationEventType phase = eventPhaseMap.get(p.getCompetitionEventId());
                if (phase == null) continue;
                int priority = PHASE_PRIORITY.indexOf(phase);
                if (priority < deepestPriority) {
                    deepestPriority = priority;
                    deepest = p;
                }
            }

            if (deepest == null) continue;

            QualificationEventType deepestPhase = eventPhaseMap.get(deepest.getCompetitionEventId());
            ParticipationStatus status = deepest.getParticipationStatus();

            if (status == ParticipationStatus.DSQ) continue;

            Integer timeMs = null;
            if (status == ParticipationStatus.FINISHED && deepest.getFinishTimeMs() != null) {
                timeMs = deepest.getFinishTimeMs();
            } else if (status == ParticipationStatus.DNF || status == ParticipationStatus.DNS) {
                // Look for time in previous phases
                timeMs = findPreviousPhaseTime(entryParticipations, deepestPriority, eventPhaseMap);
                if (timeMs == null) continue; // Excluded — no time anywhere
            }

            if (timeMs == null) continue;

            rankedEntries.add(new RankedEntry(entryId, deepestPhase, deepestPriority, timeMs, status));
        }

        // Sort: by phase priority (lower = deeper = better), then by time
        rankedEntries.sort(Comparator
                .comparingInt(RankedEntry::phasePriority)
                .thenComparingInt(RankedEntry::timeMs));

        // Assign ranks with ties
        List<CompetitionFinalStanding> standings = new ArrayList<>();
        int currentRank = 1;

        for (int i = 0; i < rankedEntries.size(); i++) {
            RankedEntry current = rankedEntries.get(i);

            if (i > 0) {
                RankedEntry prev = rankedEntries.get(i - 1);
                if (current.phasePriority() == prev.phasePriority() && current.timeMs() == prev.timeMs()) {
                    // Tie — same rank as previous
                } else {
                    currentRank = i + 1;
                }
            }

            standings.add(CompetitionFinalStanding.builder()
                    .competitionId(competition.getId())
                    .disciplineId(discipline.getId())
                    .entryId(current.entryId())
                    .overallRank(currentRank)
                    .timeMs(current.timeMs())
                    .points(BigDecimal.ZERO)
                    .build());
        }

        // Compute points
        computePoints(standings, competition, discipline);

        return standings;
    }

    private Integer findPreviousPhaseTime(List<CompetitionParticipation> participations,
                                          int deepestPriority, Map<UUID, QualificationEventType> eventPhaseMap) {
        // Look for finished participations in phases after the deepest (lower priority = earlier phase)
        for (int i = deepestPriority + 1; i < PHASE_PRIORITY.size(); i++) {
            QualificationEventType phase = PHASE_PRIORITY.get(i);
            for (CompetitionParticipation p : participations) {
                QualificationEventType pPhase = eventPhaseMap.get(p.getCompetitionEventId());
                if (pPhase == phase && p.getParticipationStatus() == ParticipationStatus.FINISHED
                        && p.getFinishTimeMs() != null) {
                    return p.getFinishTimeMs();
                }
            }
        }
        return null;
    }

    private void computePoints(List<CompetitionFinalStanding> standings, Competition competition,
                               DisciplineDefinition discipline) {
        if (competition.getScoringSchemeId() == null || standings.isEmpty()) return;

        ScoringScheme scheme = scoringSchemeRepository.findById(competition.getScoringSchemeId()).orElse(null);
        if (scheme == null) return;

        BigDecimal coefficient = boatCoefficientRepository.findAll().stream()
                .filter(c -> c.getScoringSchemeId().equals(competition.getScoringSchemeId())
                        && c.getBoatClass() == discipline.getBoatClass())
                .findFirst()
                .map(ScoringSchemeBoatCoefficient::getCoefficient)
                .orElse(BigDecimal.ONE);

        List<ScoringRule> rules = scoringRuleRepository.findByScoringSchemeIdOrderByPlacementAsc(competition.getScoringSchemeId());
        Map<Integer, BigDecimal> pointsByPlacement = new HashMap<>();
        for (ScoringRule rule : rules) {
            pointsByPlacement.put(rule.getPlacement(), rule.getBasePoints());
        }

        if (pointsByPlacement.isEmpty()) return;

        if (scheme.getScoringType() == ScoringType.OFFSET_FROM_END) {
            assignOffsetPoints(standings, pointsByPlacement, coefficient);
        } else {
            assignFixedPoints(standings, pointsByPlacement, coefficient);
        }
    }

    private void assignFixedPoints(List<CompetitionFinalStanding> standings,
                                   Map<Integer, BigDecimal> pointsByPlacement, BigDecimal coefficient) {
        for (CompetitionFinalStanding s : standings) {
            BigDecimal basePoints = pointsByPlacement.getOrDefault(s.getOverallRank(), BigDecimal.ZERO);
            s.setPoints(basePoints.multiply(coefficient).setScale(2, RoundingMode.HALF_UP));
        }
    }

    private void assignOffsetPoints(List<CompetitionFinalStanding> standings,
                                    Map<Integer, BigDecimal> pointsByPlacement, BigDecimal coefficient) {
        int maxPlacement = pointsByPlacement.keySet().stream().mapToInt(Integer::intValue).max().orElse(0);
        int totalRanked = standings.size();
        int offset = Math.max(0, maxPlacement - totalRanked);

        for (CompetitionFinalStanding s : standings) {
            int mappedPos = s.getOverallRank() + offset;
            BigDecimal basePoints = pointsByPlacement.getOrDefault(mappedPos, BigDecimal.ZERO);
            s.setPoints(basePoints.multiply(coefficient).setScale(2, RoundingMode.HALF_UP));
        }
    }

    private record RankedEntry(UUID entryId, QualificationEventType phase, int phasePriority, int timeMs,
                               ParticipationStatus status) {}
}
