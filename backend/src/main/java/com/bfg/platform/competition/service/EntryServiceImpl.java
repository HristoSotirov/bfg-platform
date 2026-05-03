package com.bfg.platform.competition.service;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationErrorsException;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.entity.CrewMember;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.entity.Entry;
import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.mapper.EntryMapper;
import com.bfg.platform.competition.query.EntryQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionGroupDefinitionRepository;
import com.bfg.platform.competition.repository.CompetitionFinalStandingRepository;
import com.bfg.platform.competition.repository.CompetitionParticipationRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.CrewMemberRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.EntryRepository;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.ClubEntriesDto;
import com.bfg.platform.gen.model.ClubEntriesRequest;
import com.bfg.platform.gen.model.CompetitionType;
import com.bfg.platform.gen.model.DisciplineGender;
import com.bfg.platform.gen.model.EntryRequest;
import com.bfg.platform.gen.model.Gender;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SeatPosition;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.AllArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class EntryServiceImpl implements EntryService {

    private static final String DISCIPLINE_PREFIX = "Discipline '";
    private static final String DISCIPLINE_NOT_FOUND = "Discipline %s not found";
    private static final String ACCREDITATION_PREFIX = ": accreditation ";

    private final CompetitionRepository competitionRepository;
    private final ClubRepository clubRepository;
    private final CompetitionTimetableEventRepository timetableEventRepository;
    private final CompetitionParticipationRepository competitionParticipationRepository;
    private final CompetitionFinalStandingRepository competitionFinalStandingRepository;
    private final DisciplineDefinitionRepository disciplineRepository;
    private final CompetitionGroupDefinitionRepository competitionGroupRepository;
    private final EntryRepository entryRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final AccreditationRepository accreditationRepository;
    private final AthleteRepository athleteRepository;
    private final EntityManager entityManager;
    private final AuthorizationService authorizationService;
    private final SecurityContextHelper securityContextHelper;

    // ═══════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public ClubEntriesDto submitEntries(UUID competitionId, UUID clubId, ClubEntriesRequest request) {
        UUID resolvedClubId = resolveClubId(clubId);
        Competition competition = loadCompetition(competitionId);
        validateClubScopeForCompetition(resolvedClubId, competition);
        EntryPhase phase = EntryPhase.resolvePhase(competition);

        validatePhaseAccess(phase);

        validateEntries(competition, resolvedClubId, request, phase);
        List<Entry> savedEntries = persistEntries(competitionId, resolvedClubId, request);

        ClubEntriesDto result = buildResponseWithCrewMembers(savedEntries);
        if (phase == EntryPhase.RACE) {
            boolean progressionExists = competitionParticipationRepository
                    .existsByCompetitionEventCompetitionId(competitionId);
            result.setProgressionWarning(progressionExists);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public ClubEntriesDto getEntries(UUID competitionId, UUID clubId, List<String> expand) {
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));

        UUID resolvedClubId = resolveClubIdForRead(clubId, competition);

        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Entry.class);
        Specification<Entry> spec = EntryQueryAdapter.scopeToCompetition(competitionId, resolvedClubId);

        List<Entry> entries;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<Entry> entityGraph = DynamicEntityGraph.create(entityManager, Entry.class, requestedExpand);
            entries = findAllWithEntityGraph(spec, entityGraph);
        } else {
            entries = entryRepository.findAll(spec);
        }

        ClubEntriesDto result = new ClubEntriesDto();
        result.setEntries(entries.stream()
                .map(e -> EntryMapper.toDto(e, requestedExpand))
                .toList());
        return result;
    }

    private List<Entry> findAllWithEntityGraph(Specification<Entry> spec, EntityGraph<Entry> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Entry> query = cb.createQuery(Entry.class);
        Root<Entry> root = query.from(Entry.class);
        query.distinct(true);

        Predicate predicate = spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        TypedQuery<Entry> typedQuery = entityManager.createQuery(query);
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        return typedQuery.getResultList();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SUBMIT — ORCHESTRATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private Competition loadCompetition(UUID competitionId) {
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));
        if (competition.isTemplate()) {
            throw new ForbiddenException("Cannot submit entries for a competition template");
        }
        return competition;
    }

    private void validateClubScopeForCompetition(UUID clubId, Competition competition) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubId));
        CompetitionType type = competition.getCompetitionType();
        ScopeType clubScope = club.getType();

        if (type == CompetitionType.NATIONAL_ERGO || type == CompetitionType.NATIONAL_WATER) {
            if (clubScope != ScopeType.INTERNAL) {
                throw new ForbiddenException("Only INTERNAL clubs can participate in " + type + " competitions");
            }
        } else if (type == CompetitionType.BALKAN) {
            if (clubScope != ScopeType.NATIONAL) {
                throw new ForbiddenException("Only NATIONAL clubs can participate in BALKAN competitions");
            }
        }
    }

    private void validatePhaseAccess(EntryPhase phase) {
        switch (phase) {
            case NOT_OPEN ->
                throw new ValidationErrorsException(List.of("Entry submission period has not opened yet"));
            case SUBMISSION -> { /* all roles allowed */ }
            case LIMITED_EDIT -> { /* all roles allowed (restrictions applied in validation) */ }
            case ADMIN_EDIT, RACE -> {
                if (!isAdmin()) {
                    throw new ForbiddenException("Only administrators can modify entries in the "
                            + phase.name() + " phase");
                }
            }
        }
    }

    private record EntryValidationData(
            Set<UUID> allowedDisciplineIds,
            Map<UUID, DisciplineDefinition> disciplineMap,
            Map<UUID, Accreditation> accreditationMap,
            Map<UUID, Athlete> athleteMap,
            Map<UUID, CompetitionGroupDefinition> transferGroupMap
    ) {}

    private void validateEntries(Competition competition, UUID clubId, ClubEntriesRequest request,
                                   EntryPhase phase) {
        UUID competitionId = competition.getId();
        int competitionYear = competition.getStartDate() != null
                ? competition.getStartDate().getYear() : java.time.LocalDate.now().getYear();

        List<String> errors = new ArrayList<>();
        EntryValidationData data = loadValidationData(competitionId, request);
        var ctx = new CrewValidationContext(clubId, competitionYear, data.accreditationMap(), data.athleteMap());

        // Group entries by competition group → then by discipline within each group
        Map<UUID, Map<UUID, List<EntryRequest>>> byGroupThenDiscipline = new HashMap<>();

        for (EntryRequest entry : request.getEntries()) {
            DisciplineDefinition disc = data.disciplineMap().get(entry.getDisciplineId());
            if (disc == null) continue;
            byGroupThenDiscipline
                    .computeIfAbsent(disc.getCompetitionGroupId(), k -> new HashMap<>())
                    .computeIfAbsent(entry.getDisciplineId(), k -> new ArrayList<>())
                    .add(entry);
        }

        // Validate each group with all its disciplines
        for (Map.Entry<UUID, Map<UUID, List<EntryRequest>>> groupEntry : byGroupThenDiscipline.entrySet()) {
            validateGroup(groupEntry.getValue(), data, ctx, errors);
        }

        // Phase-dependent change restrictions
        if (phase != EntryPhase.SUBMISSION) {
            Map<UUID, List<EntryRequest>> byDiscipline = new HashMap<>();
            for (EntryRequest entry : request.getEntries()) {
                byDiscipline.computeIfAbsent(entry.getDisciplineId(), k -> new ArrayList<>()).add(entry);
            }
            validateChangeRestrictions(competitionId, clubId, byDiscipline, errors);
        }

        if (!errors.isEmpty()) {
            throw new ValidationErrorsException(errors);
        }
    }

    private record GenderTeamResult(
            Set<UUID> transferredAthleteIds,
            Set<UUID> allRowerIds,
            Map<UUID, Set<UUID>> athleteRowingDisciplines
    ) {}

    /**
     * Validates all disciplines within a single competition group.
     * Splits disciplines by gender, validates each gender team separately,
     * then validates mixed disciplines and applies group-level rules per gender.
     */
    private void validateGroup(Map<UUID, List<EntryRequest>> disciplineEntries,
                                EntryValidationData data, CrewValidationContext ctx,
                                List<String> errors) {
        // Determine the group from any discipline
        CompetitionGroupDefinition group = null;
        for (UUID discId : disciplineEntries.keySet()) {
            DisciplineDefinition disc = data.disciplineMap().get(discId);
            if (disc != null) { group = disc.getCompetitionGroup(); break; }
        }
        if (group == null) return;

        CompetitionGroupDefinition transferSourceGroup = (group.getTransferFromGroupId() != null)
                ? data.transferGroupMap().get(group.getTransferFromGroupId()) : null;

        // Split disciplines by gender
        Map<UUID, List<EntryRequest>> maleDisciplines = new HashMap<>();
        Map<UUID, List<EntryRequest>> femaleDisciplines = new HashMap<>();
        Map<UUID, List<EntryRequest>> mixedDisciplines = new HashMap<>();

        for (var de : disciplineEntries.entrySet()) {
            DisciplineDefinition disc = data.disciplineMap().get(de.getKey());
            if (disc == null) continue;
            switch (disc.getGender()) {
                case MALE -> maleDisciplines.put(de.getKey(), de.getValue());
                case FEMALE -> femaleDisciplines.put(de.getKey(), de.getValue());
                case MIXED -> mixedDisciplines.put(de.getKey(), de.getValue());
            }
        }

        // Phase 1: Validate male team
        GenderTeamResult maleResult = validateGenderTeam(DisciplineGender.MALE, maleDisciplines,
                group, transferSourceGroup, data, ctx, errors);

        // Phase 2: Validate female team
        GenderTeamResult femaleResult = validateGenderTeam(DisciplineGender.FEMALE, femaleDisciplines,
                group, transferSourceGroup, data, ctx, errors);

        // Phase 3: Validate mixed disciplines
        validateMixedDisciplines(mixedDisciplines, group, transferSourceGroup,
                maleResult, femaleResult, data, ctx, errors);

        // Phase 4: maxDisciplinesPerAthlete (per-gender, rowing only, cox unlimited)
        validateMaxDisciplinesPerAthlete(group, maleResult.athleteRowingDisciplines(), "Мъжки", ctx.athleteMap(), errors);
        validateMaxDisciplinesPerAthlete(group, femaleResult.athleteRowingDisciplines(), "Женски", ctx.athleteMap(), errors);

        // Phase 5: transferredMaxDisciplinesPerAthlete (per-gender, rowing only)
        validateTransferredMaxDisciplines(group, maleResult, "мъжки", ctx.athleteMap(), errors);
        validateTransferredMaxDisciplines(group, femaleResult, "женски", ctx.athleteMap(), errors);

        // Phase 6: Transfer ratio per-gender (including mixed rowers counted toward their gender)
        validateTransferRatio(group, maleResult, "Мъжки", errors);
        validateTransferRatio(group, femaleResult, "Женски", errors);
    }

    private GenderTeamResult validateGenderTeam(
            DisciplineGender gender,
            Map<UUID, List<EntryRequest>> disciplineEntries,
            CompetitionGroupDefinition group,
            CompetitionGroupDefinition transferSourceGroup,
            EntryValidationData data,
            CrewValidationContext ctx,
            List<String> errors) {

        Set<UUID> transferredAthleteIds = new HashSet<>();
        Set<UUID> allRowerIds = new HashSet<>();
        Map<UUID, Set<UUID>> athleteRowingDisciplines = new HashMap<>();

        for (var de : disciplineEntries.entrySet()) {
            UUID disciplineId = de.getKey();
            List<EntryRequest> entries = de.getValue();

            Set<UUID> disciplineTransferred = new HashSet<>();
            validateDisciplineEntries(disciplineId, entries, group, transferSourceGroup, data, ctx,
                    disciplineTransferred, errors);

            // Accumulate rower stats (cox excluded)
            collectRowerStats(entries, disciplineId, data.accreditationMap(), disciplineTransferred,
                    allRowerIds, transferredAthleteIds, athleteRowingDisciplines);
        }

        return new GenderTeamResult(transferredAthleteIds, allRowerIds, athleteRowingDisciplines);
    }

    private void validateMixedDisciplines(
            Map<UUID, List<EntryRequest>> disciplineEntries,
            CompetitionGroupDefinition group,
            CompetitionGroupDefinition transferSourceGroup,
            GenderTeamResult maleResult,
            GenderTeamResult femaleResult,
            EntryValidationData data,
            CrewValidationContext ctx,
            List<String> errors) {

        for (var de : disciplineEntries.entrySet()) {
            UUID disciplineId = de.getKey();
            List<EntryRequest> entries = de.getValue();

            Set<UUID> disciplineTransferred = new HashSet<>();
            validateDisciplineEntries(disciplineId, entries, group, transferSourceGroup, data, ctx,
                    disciplineTransferred, errors);

            DisciplineDefinition discipline = data.disciplineMap().get(disciplineId);
            if (discipline == null) continue;

            // Validate 50/50 composition per entry
            for (EntryRequest entry : entries) {
                String label = DISCIPLINE_PREFIX + discipline.getShortName() + "' team " + entry.getTeamNumber();
                validateMixedCrewComposition(discipline, entry, label, ctx, errors);
            }

            // Track mixed rowers by their actual gender
            for (EntryRequest entry : entries) {
                if (entry.getCrewMembers() == null) continue;
                for (var cm : entry.getCrewMembers()) {
                    if (SeatPosition.COX.equals(cm.getSeatPosition())) continue;
                    Accreditation acc = data.accreditationMap().get(cm.getAccreditationId());
                    if (acc == null) continue;
                    UUID athleteId = acc.getAthleteId();
                    Athlete athlete = ctx.athleteMap().get(athleteId);
                    if (athlete == null) continue;

                    boolean isTransferred = disciplineTransferred.contains(athleteId);

                    if (Gender.MALE.equals(athlete.getGender())) {
                        maleResult.allRowerIds().add(athleteId);
                        maleResult.athleteRowingDisciplines()
                                .computeIfAbsent(athleteId, k -> new HashSet<>()).add(disciplineId);
                        if (isTransferred) maleResult.transferredAthleteIds().add(athleteId);
                    } else if (Gender.FEMALE.equals(athlete.getGender())) {
                        femaleResult.allRowerIds().add(athleteId);
                        femaleResult.athleteRowingDisciplines()
                                .computeIfAbsent(athleteId, k -> new HashSet<>()).add(disciplineId);
                        if (isTransferred) femaleResult.transferredAthleteIds().add(athleteId);
                    }
                }
            }
        }
    }

    private void collectRowerStats(List<EntryRequest> entries, UUID disciplineId,
                                    Map<UUID, Accreditation> accreditationMap,
                                    Set<UUID> disciplineTransferred,
                                    Set<UUID> allRowerIds,
                                    Set<UUID> transferredAthleteIds,
                                    Map<UUID, Set<UUID>> athleteRowingDisciplines) {
        for (EntryRequest entry : entries) {
            if (entry.getCrewMembers() == null) continue;
            for (var cm : entry.getCrewMembers()) {
                if (SeatPosition.COX.equals(cm.getSeatPosition())) continue;
                Accreditation acc = accreditationMap.get(cm.getAccreditationId());
                if (acc == null) continue;
                UUID athleteId = acc.getAthleteId();
                allRowerIds.add(athleteId);
                athleteRowingDisciplines.computeIfAbsent(athleteId, k -> new HashSet<>()).add(disciplineId);
                if (disciplineTransferred.contains(athleteId)) {
                    transferredAthleteIds.add(athleteId);
                }
            }
        }
    }

    private void validateMaxDisciplinesPerAthlete(CompetitionGroupDefinition group,
                                                   Map<UUID, Set<UUID>> athleteRowingDisciplines,
                                                   String genderLabel, Map<UUID, Athlete> athleteMap,
                                                   List<String> errors) {
        for (var ae : athleteRowingDisciplines.entrySet()) {
            if (ae.getValue().size() > group.getMaxDisciplinesPerAthlete()) {
                Athlete athlete = athleteMap.get(ae.getKey());
                String name = formatAthleteById(athlete, ae.getKey());
                errors.add(genderLabel + " спортист " + name
                        + " надвишава макс. дисциплини в група '"
                        + group.getShortName() + "' (" + ae.getValue().size()
                        + "/" + group.getMaxDisciplinesPerAthlete() + ")");
            }
        }
    }

    private void validateTransferredMaxDisciplines(CompetitionGroupDefinition group,
                                                    GenderTeamResult result,
                                                    String genderLabel, Map<UUID, Athlete> athleteMap,
                                                    List<String> errors) {
        if (group.getTransferredMaxDisciplinesPerAthlete() == null) return;
        for (UUID transferred : result.transferredAthleteIds()) {
            Set<UUID> disciplines = result.athleteRowingDisciplines().get(transferred);
            if (disciplines != null && disciplines.size() > group.getTransferredMaxDisciplinesPerAthlete()) {
                Athlete athlete = athleteMap.get(transferred);
                String name = formatAthleteById(athlete, transferred);
                errors.add("Прехвърлен " + genderLabel.toLowerCase() + " спортист " + name
                        + " надвишава макс. дисциплини в група '" + group.getShortName()
                        + "' (" + disciplines.size() + "/" + group.getTransferredMaxDisciplinesPerAthlete() + ")");
            }
        }
    }

    private void validateTransferRatio(CompetitionGroupDefinition group,
                                        GenderTeamResult result,
                                        String genderLabel, List<String> errors) {
        if (group.getTransferRatio() == null || result.transferredAthleteIds().isEmpty()) return;
        int totalRowers = result.allRowerIds().size();
        int transferredCount = result.transferredAthleteIds().size();
        int maxTransferred = applyRounding(totalRowers, group.getTransferRatio(), group.getTransferRounding());
        if (transferredCount > maxTransferred) {
            errors.add(genderLabel + " отбор в група '" + group.getShortName()
                    + "': твърде много прехвърлени гребци — " + transferredCount
                    + " от " + totalRowers + " (макс. " + group.getTransferRatio()
                    + "% = " + maxTransferred + ")");
        }
    }

    private EntryValidationData loadValidationData(UUID competitionId, ClubEntriesRequest request) {
        Set<UUID> allowedDisciplineIds = timetableEventRepository
                .findDistinctDisciplineIdsByCompetitionId(competitionId);

        List<UUID> requestedDisciplineIds = request.getEntries().stream()
                .map(EntryRequest::getDisciplineId).distinct().toList();
        Map<UUID, DisciplineDefinition> disciplineMap = disciplineRepository.findAllById(requestedDisciplineIds)
                .stream().collect(Collectors.toMap(DisciplineDefinition::getId, Function.identity()));

        Set<UUID> allAccreditationIds = request.getEntries().stream()
                .flatMap(e -> e.getCrewMembers().stream())
                .map(cm -> cm.getAccreditationId()).collect(Collectors.toSet());
        Map<UUID, Accreditation> accreditationMap = accreditationRepository.findAllById(allAccreditationIds)
                .stream().collect(Collectors.toMap(Accreditation::getId, Function.identity()));

        Set<UUID> allAthleteIds = accreditationMap.values().stream()
                .map(Accreditation::getAthleteId).collect(Collectors.toSet());
        Map<UUID, Athlete> athleteMap = athleteRepository.findAllById(allAthleteIds)
                .stream().collect(Collectors.toMap(Athlete::getId, Function.identity()));

        Set<UUID> transferGroupIds = disciplineMap.values().stream()
                .map(DisciplineDefinition::getCompetitionGroup).filter(Objects::nonNull)
                .map(CompetitionGroupDefinition::getTransferFromGroupId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, CompetitionGroupDefinition> transferGroupMap = transferGroupIds.isEmpty() ? Map.of()
                : competitionGroupRepository.findAllById(transferGroupIds).stream()
                    .collect(Collectors.toMap(CompetitionGroupDefinition::getId, Function.identity()));

        return new EntryValidationData(allowedDisciplineIds, disciplineMap,
                accreditationMap, athleteMap, transferGroupMap);
    }

    private void validateDisciplineEntries(UUID disciplineId, List<EntryRequest> disciplineEntries,
                                            CompetitionGroupDefinition group,
                                            CompetitionGroupDefinition transferSourceGroup,
                                            EntryValidationData data, CrewValidationContext ctx,
                                            Set<UUID> transferredAthleteIds,
                                            List<String> errors) {
        if (!data.allowedDisciplineIds().contains(disciplineId)) {
            errors.add("Discipline " + disciplineId + " is not in the competition timetable");
            return;
        }
        DisciplineDefinition discipline = data.disciplineMap().get(disciplineId);
        if (discipline == null) {
            errors.add(String.format(DISCIPLINE_NOT_FOUND, disciplineId));
            return;
        }

        validateTeamNumbers(discipline, disciplineEntries, errors);
        validateAthleteUniquenessPerDiscipline(discipline, disciplineEntries, data.accreditationMap(), errors);

        for (EntryRequest entry : disciplineEntries) {
            validateCrewMembers(discipline, group, transferSourceGroup, entry,
                    ctx, transferredAthleteIds, errors);
        }

        if (group != null && group.getTransferFromGroupId() != null) {
            validatePerBoatTransferLimit(discipline, disciplineEntries, transferredAthleteIds,
                    data.accreditationMap(), errors);
        }
    }

    private void validateTeamNumbers(DisciplineDefinition discipline, List<EntryRequest> entries, List<String> errors) {
        List<Integer> teamNumbers = entries.stream().map(EntryRequest::getTeamNumber).sorted().toList();
        for (int i = 0; i < teamNumbers.size(); i++) {
            if (teamNumbers.get(i) != i + 1) {
                errors.add(DISCIPLINE_PREFIX + discipline.getShortName()
                        + "': team numbers must form a contiguous sequence starting at 1");
                break;
            }
        }
        if (teamNumbers.size() > discipline.getMaxBoatsPerClub()) {
            errors.add(DISCIPLINE_PREFIX + discipline.getShortName()
                    + "': too many teams — max " + discipline.getMaxBoatsPerClub() + ", submitted " + teamNumbers.size());
        }
    }

    /**
     * Rule 8: same athlete (via accreditation) cannot appear in multiple teams of the same discipline.
     */
    private void validateAthleteUniquenessPerDiscipline(
            DisciplineDefinition discipline, List<EntryRequest> entries,
            Map<UUID, Accreditation> accreditationMap, List<String> errors) {

        Set<UUID> seenAthletes = new HashSet<>();
        for (EntryRequest entry : entries) {
            if (entry.getCrewMembers() == null) continue;
            for (var cm : entry.getCrewMembers()) {
                Accreditation acc = accreditationMap.get(cm.getAccreditationId());
                if (acc == null) continue;
                if (!seenAthletes.add(acc.getAthleteId())) {
                    errors.add(DISCIPLINE_PREFIX + discipline.getShortName()
                            + "': athlete " + acc.getAthleteId()
                            + " appears in multiple teams");
                }
            }
        }
    }

    private record CrewValidationContext(
            UUID clubId,
            int competitionYear,
            Map<UUID, Accreditation> accreditationMap,
            Map<UUID, Athlete> athleteMap
    ) {}

    private void validateCrewMembers(
            DisciplineDefinition discipline, CompetitionGroupDefinition group,
            CompetitionGroupDefinition transferSourceGroup, EntryRequest entry,
            CrewValidationContext ctx,
            Set<UUID> transferredAthleteIds, List<String> errors) {

        String label = DISCIPLINE_PREFIX + discipline.getShortName() + "' team " + entry.getTeamNumber();
        int expectedCrew = (discipline.getCrewSize() != null ? discipline.getCrewSize() : 0)
                + (discipline.isHasCoxswain() ? 1 : 0);

        if (entry.getCrewMembers() == null || entry.getCrewMembers().size() != expectedCrew) {
            errors.add(label + ": crew size must be " + expectedCrew
                    + " (got " + (entry.getCrewMembers() == null ? 0 : entry.getCrewMembers().size()) + ")");
            return;
        }

        Set<SeatPosition> usedSeats = new HashSet<>();
        Set<UUID> usedAccreditations = new HashSet<>();
        Set<SeatPosition> validSeats = validSeatPositions(discipline.getCrewSize(), discipline.isHasCoxswain());

        for (var cm : entry.getCrewMembers()) {
            validateSeatAndAccreditation(cm, label, validSeats, usedSeats, usedAccreditations, errors);

            Accreditation acc = ctx.accreditationMap().get(cm.getAccreditationId());
            if (acc == null) {
                errors.add(label + ACCREDITATION_PREFIX + cm.getAccreditationId() + " not found");
                continue;
            }
            validateAccreditationState(acc, label, ctx.clubId(), ctx.competitionYear(), errors);
            validateGroupEligibility(acc, label, discipline, group, transferSourceGroup,
                    cm.getSeatPosition(), ctx.competitionYear(), ctx.athleteMap(), transferredAthleteIds, errors);
        }
    }

    private void validateMixedCrewComposition(
            DisciplineDefinition discipline, EntryRequest entry, String label,
            CrewValidationContext ctx, List<String> errors) {

        int maleCount = 0;
        int femaleCount = 0;
        for (var cm : entry.getCrewMembers()) {
            if (SeatPosition.COX.equals(cm.getSeatPosition())) continue;
            Accreditation acc = ctx.accreditationMap().get(cm.getAccreditationId());
            if (acc == null) continue;
            Athlete athlete = ctx.athleteMap().get(acc.getAthleteId());
            if (athlete == null) continue;
            if (Gender.MALE.equals(athlete.getGender())) maleCount++;
            else if (Gender.FEMALE.equals(athlete.getGender())) femaleCount++;
        }

        int rowerCount = discipline.getCrewSize();
        int expectedPerGender = rowerCount / 2;

        if (maleCount != expectedPerGender || femaleCount != expectedPerGender) {
            errors.add(label + ": mixed discipline requires " + expectedPerGender
                    + " male and " + expectedPerGender + " female rowers"
                    + " (got " + maleCount + " male, " + femaleCount + " female)");
        }
    }

    private void validateSeatAndAccreditation(
            com.bfg.platform.gen.model.CrewMemberRequest cm, String label,
            Set<SeatPosition> validSeats, Set<SeatPosition> usedSeats,
            Set<UUID> usedAccreditations, List<String> errors) {

        SeatPosition seat = cm.getSeatPosition();
        if (!validSeats.contains(seat)) {
            errors.add(label + ": invalid seat position " + seat);
        }
        if (!usedSeats.add(seat)) {
            errors.add(label + ": duplicate seat position " + seat);
        }
        if (!usedAccreditations.add(cm.getAccreditationId())) {
            errors.add(label + ACCREDITATION_PREFIX + cm.getAccreditationId() + " appears twice");
        }
    }

    private void validateAccreditationState(
            Accreditation acc, String label, UUID clubId, int competitionYear,
            List<String> errors) {

        if (!AccreditationStatus.ACTIVE.equals(acc.getStatus())) {
            errors.add(label + ACCREDITATION_PREFIX + acc.getId() + " is not ACTIVE");
        }
        if (!Integer.valueOf(competitionYear).equals(acc.getYear())) {
            errors.add(label + ACCREDITATION_PREFIX + "year mismatch");
        }
        if (!clubId.equals(acc.getClubId())) {
            errors.add(label + ACCREDITATION_PREFIX + "belongs to a different club");
        }
    }

    private void validateGroupEligibility(
            Accreditation acc, String label,
            DisciplineDefinition discipline,
            CompetitionGroupDefinition group, CompetitionGroupDefinition transferSourceGroup,
            SeatPosition seatPosition, int competitionYear, Map<UUID, Athlete> athleteMap,
            Set<UUID> transferredAthleteIds, List<String> errors) {

        if (group == null) return;

        Athlete athlete = athleteMap.get(acc.getAthleteId());
        if (athlete == null) return;

        boolean isCox = SeatPosition.COX.equals(seatPosition);
        boolean matchesTarget = isEligibleForDiscipline(athlete, discipline, group, competitionYear, isCox);
        if (matchesTarget) return;

        boolean matchesTransfer = transferSourceGroup != null
                && isEligibleForDiscipline(athlete, discipline, transferSourceGroup, competitionYear, isCox);
        if (matchesTransfer) {
            transferredAthleteIds.add(acc.getAthleteId());
            return;
        }

        errors.add(label + ": " + formatAthlete(athlete, acc) + " не отговаря на изискванията на групата");
    }

    private static int applyRounding(int total, int ratioPercent, com.bfg.platform.gen.model.TransferRounding rounding) {
        double raw = total * ratioPercent / 100.0;
        if (rounding == null) return (int) Math.floor(raw);
        return switch (rounding) {
            case FLOOR -> (int) Math.floor(raw);
            case CEIL -> (int) Math.ceil(raw);
            case ROUND -> (int) Math.round(raw);
        };
    }


    private List<Entry> persistEntries(UUID competitionId, UUID clubId, ClubEntriesRequest request) {
        List<Entry> existing = entryRepository.findByCompetitionIdAndClubId(competitionId, clubId);

        // Index existing entries by natural key: disciplineId + teamNumber
        Map<String, Entry> existingByKey = new HashMap<>();
        for (Entry e : existing) {
            existingByKey.put(entryKey(e.getDisciplineId(), e.getTeamNumber()), e);
        }

        Set<String> incomingKeys = new HashSet<>();
        List<Entry> result = new ArrayList<>();

        for (EntryRequest er : request.getEntries()) {
            String key = entryKey(er.getDisciplineId(), er.getTeamNumber());
            incomingKeys.add(key);

            Entry entry = existingByKey.get(key);
            if (entry != null) {
                // Existing entry — update crew members
                syncCrewMembers(entry, er);
            } else {
                // New entry
                entry = new Entry();
                entry.setCompetitionId(competitionId);
                entry.setClubId(clubId);
                entry.setDisciplineId(er.getDisciplineId());
                entry.setTeamNumber(er.getTeamNumber());
                entry = entryRepository.save(entry);
                saveCrewMembers(entry.getId(), er);
            }
            result.add(entry);
        }

        // Delete entries no longer in the request (cascade deletes crew_members and unraced participations)
        List<String> deleteErrors = new ArrayList<>();
        for (Map.Entry<String, Entry> e : existingByKey.entrySet()) {
            if (!incomingKeys.contains(e.getKey())) {
                validateEntryDeletion(e.getValue(), deleteErrors);
            }
        }
        if (!deleteErrors.isEmpty()) {
            throw new ValidationErrorsException(deleteErrors);
        }
        for (Map.Entry<String, Entry> e : existingByKey.entrySet()) {
            if (!incomingKeys.contains(e.getKey())) {
                entryRepository.delete(e.getValue());
            }
        }

        return result;
    }

    private void syncCrewMembers(Entry entry, EntryRequest request) {
        List<CrewMember> existing = crewMemberRepository.findByEntryIdIn(List.of(entry.getId()));
        Map<SeatPosition, CrewMember> existingBySeat = existing.stream()
                .collect(Collectors.toMap(CrewMember::getSeatPosition, Function.identity()));

        Set<SeatPosition> incomingSeats = new HashSet<>();
        for (var cmr : request.getCrewMembers()) {
            incomingSeats.add(cmr.getSeatPosition());
            CrewMember cm = existingBySeat.get(cmr.getSeatPosition());
            if (cm != null) {
                if (!Objects.equals(cm.getAccreditationId(), cmr.getAccreditationId())) {
                    cm.setAccreditationId(cmr.getAccreditationId());
                    crewMemberRepository.save(cm);
                }
            } else {
                CrewMember newCm = new CrewMember();
                newCm.setEntryId(entry.getId());
                newCm.setSeatPosition(cmr.getSeatPosition());
                newCm.setAccreditationId(cmr.getAccreditationId());
                crewMemberRepository.save(newCm);
            }
        }

        for (CrewMember cm : existing) {
            if (!incomingSeats.contains(cm.getSeatPosition())) {
                crewMemberRepository.delete(cm);
            }
        }
    }

    private void saveCrewMembers(UUID entryId, EntryRequest request) {
        for (var cmr : request.getCrewMembers()) {
            CrewMember cm = new CrewMember();
            cm.setEntryId(entryId);
            cm.setSeatPosition(cmr.getSeatPosition());
            cm.setAccreditationId(cmr.getAccreditationId());
            crewMemberRepository.save(cm);
        }
    }

    private void validateEntryDeletion(Entry entry, List<String> errors) {
        UUID entryId = entry.getId();
        String label = DISCIPLINE_PREFIX + entry.getDisciplineId() + "' team " + entry.getTeamNumber();

        if (competitionFinalStandingRepository.existsByEntryId(entryId)) {
            errors.add(label + ": cannot delete — final standings exist for this entry");
        }
        if (competitionParticipationRepository.existsByEntryIdAndFinishTimeMsIsNotNull(entryId)) {
            errors.add(label + ": cannot delete — entry has recorded race results");
        }

        // Block if entry has participations in non-first-stage events (i.e. was advanced)
        List<com.bfg.platform.competition.entity.CompetitionParticipation> participations =
                competitionParticipationRepository.findByEntryId(entryId);
        if (!participations.isEmpty()) {
            UUID disciplineId = entry.getDisciplineId();
            UUID competitionId = entry.getCompetitionId();

            // Determine first stage: if H events exist for this discipline, first stage is H; otherwise FA
            boolean hasHeats = timetableEventRepository
                    .findByCompetitionIdAndDisciplineIdAndQualificationEventType(competitionId, disciplineId, QualificationEventType.H)
                    .stream().findAny().isPresent();
            QualificationEventType firstStage = hasHeats ? QualificationEventType.H : QualificationEventType.FA;

            for (var p : participations) {
                com.bfg.platform.competition.entity.CompetitionTimetableEvent event =
                        timetableEventRepository.findById(p.getCompetitionEventId()).orElse(null);
                if (event != null && !firstStage.equals(event.getQualificationEventType())) {
                    errors.add(label + ": cannot delete — entry has been advanced to " + event.getQualificationEventType());
                    break;
                }
            }
        }
    }

    private static String entryKey(UUID disciplineId, Integer teamNumber) {
        return disciplineId + ":" + teamNumber;
    }

    private ClubEntriesDto buildResponseWithCrewMembers(List<Entry> savedEntries) {
        // Reload entries with crew members eagerly fetched
        Set<String> crewExpand = Set.of("crewMembers");
        EntityGraph<Entry> entityGraph = DynamicEntityGraph.create(entityManager, Entry.class, crewExpand);

        List<UUID> ids = savedEntries.stream().map(Entry::getId).toList();
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Entry> query = cb.createQuery(Entry.class);
        Root<Entry> root = query.from(Entry.class);
        query.where(root.get("id").in(ids));

        TypedQuery<Entry> typedQuery = entityManager.createQuery(query);
        typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        List<Entry> reloaded = typedQuery.getResultList();

        ClubEntriesDto result = new ClubEntriesDto();
        result.setEntries(reloaded.stream()
                .map(e -> EntryMapper.toDto(e, crewExpand))
                .toList());
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  AUTH HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private static String formatAthlete(Athlete athlete, Accreditation acc) {
        String name = (athlete.getFirstName() != null ? athlete.getFirstName() : "")
                + " " + (athlete.getLastName() != null ? athlete.getLastName() : "");
        name = name.trim();
        String card = acc.getAccreditationNumber() != null ? acc.getAccreditationNumber() : "";
        if (!card.isEmpty()) return card + " " + name;
        return name.isEmpty() ? acc.getAthleteId().toString() : name;
    }

    private static String formatAthleteById(Athlete athlete, UUID athleteId) {
        if (athlete == null) return athleteId.toString();
        String name = (athlete.getFirstName() != null ? athlete.getFirstName() : "")
                + " " + (athlete.getLastName() != null ? athlete.getLastName() : "");
        return name.trim().isEmpty() ? athleteId.toString() : name.trim();
    }

    private boolean isAdmin() {
        return securityContextHelper.isAppAdmin() || securityContextHelper.isFederationAdmin();
    }

    /** For write operations — validates the user has rights to operate on the requested club */
    private UUID resolveClubId(UUID requestedClubId) {
        if (isAdmin()) {
            // APP_ADMIN and FEDERATION_ADMIN can operate on any club
            return requestedClubId;
        }
        // CLUB_ADMIN / COACH: verify the requested club is their own
        UUID userClubId = authorizationService.requireCurrentUserClubId();
        if (!userClubId.equals(requestedClubId)) {
            throw new ForbiddenException("You can only submit entries for your own club");
        }
        return requestedClubId;
    }

    private UUID resolveClubIdForRead(UUID requestedClubId, Competition competition) {
        if (isAdmin()) {
            return requestedClubId; // null = all clubs
        }
        if (requestedClubId != null) {
            throw new ForbiddenException("Only admins can filter by clubId");
        }
        EntryPhase phase = EntryPhase.resolvePhase(competition);
        if (phase == EntryPhase.SUBMISSION || phase == EntryPhase.NOT_OPEN) {
            return authorizationService.requireCurrentUserClubId();
        }
        return null;
    }

    private boolean isEligibleForDiscipline(Athlete athlete, DisciplineDefinition discipline,
                                             CompetitionGroupDefinition group, int competitionYear, boolean isCox) {
        DisciplineGender requiredGender = discipline.getGender();
        if (!isCox && requiredGender != DisciplineGender.MIXED) {
            Gender expected = requiredGender == DisciplineGender.MALE ? Gender.MALE : Gender.FEMALE;
            if (!expected.equals(athlete.getGender())) return false;
        }
        if (athlete.getDateOfBirth() != null) {
            int athleteAge = competitionYear - athlete.getDateOfBirth().getYear();
            Integer minAge = isCox && group.getCoxMinAge() != null ? group.getCoxMinAge() : group.getMinAge();
            Integer maxAge = isCox && group.getCoxMaxAge() != null ? group.getCoxMaxAge() : group.getMaxAge();
            if (minAge != null && athleteAge < minAge) return false;
            if (maxAge != null && athleteAge > maxAge) return false;
        }
        return true;
    }

    private void validatePerBoatTransferLimit(
            DisciplineDefinition discipline,
            List<EntryRequest> entries,
            Set<UUID> transferredAthleteIds,
            Map<UUID, Accreditation> accreditationMap,
            List<String> errors) {

        for (EntryRequest entry : entries) {
            String entryLabel = DISCIPLINE_PREFIX + discipline.getShortName() + "' team " + entry.getTeamNumber();
            int transferCount = countTransfersInEntry(entry, transferredAthleteIds, accreditationMap);

            if (transferCount > discipline.getMaxCrewFromTransfer()) {
                errors.add(entryLabel + ": too many transferred athletes (max "
                        + discipline.getMaxCrewFromTransfer() + ", found " + transferCount + ")");
            }
        }
    }

    private int countTransfersInEntry(EntryRequest entry, Set<UUID> transferredAthleteIds,
                                       Map<UUID, Accreditation> accreditationMap) {
        int transferCount = 0;
        for (var cm : entry.getCrewMembers()) {
            Accreditation acc = accreditationMap.get(cm.getAccreditationId());
            UUID athleteId = acc != null ? acc.getAthleteId() : null;
            boolean isTransferred = athleteId != null && transferredAthleteIds.contains(athleteId);

            if (isTransferred && !SeatPosition.COX.equals(cm.getSeatPosition())) {
                transferCount++;
            }
        }
        return transferCount;
    }

    private void validateChangeRestrictions(
            UUID competitionId, UUID clubId,
            Map<UUID, List<EntryRequest>> byDiscipline,
            List<String> errors) {

        List<Entry> previousEntries = entryRepository.findByCompetitionIdAndClubId(competitionId, clubId);

        // Build previous state: discipline -> team count
        Map<UUID, Long> prevTeamCount = previousEntries.stream()
                .collect(Collectors.groupingBy(Entry::getDisciplineId, Collectors.counting()));

        Set<UUID> prevDisciplines = prevTeamCount.keySet();

        for (Map.Entry<UUID, List<EntryRequest>> e : byDiscipline.entrySet()) {
            UUID disciplineId = e.getKey();
            int newTeamCount = e.getValue().size();

            // E1: cannot add new disciplines
            if (!prevDisciplines.contains(disciplineId)) {
                errors.add("Cannot add new discipline " + disciplineId
                        + " after entry submission period has closed");
                continue;
            }

            // E2: cannot increase team count
            long prevCount = prevTeamCount.getOrDefault(disciplineId, 0L);
            if (newTeamCount > prevCount) {
                errors.add("Cannot increase team count for discipline " + disciplineId
                        + " after entry submission period has closed (was " + prevCount
                        + ", requested " + newTeamCount + ")");
            }
        }
    }

    /**
     * Returns the valid seat positions for a given crew size and coxswain configuration.
     * The positions are named by seat number (BOW=1, TWO=2, ... STROKE=crewSizeWithoutCox, COX).
     */
    private Set<SeatPosition> validSeatPositions(int crewSize, boolean hasCoxswain) {
        Set<SeatPosition> seats = new HashSet<>();
        int rowingSeats = crewSize;

        // Always assign STROKE to the last rowing seat
        // For larger boats, assign numbered seats
        if (rowingSeats >= 1) seats.add(SeatPosition.STROKE);
        if (rowingSeats >= 2) seats.add(SeatPosition.BOW);
        if (rowingSeats >= 3) seats.add(SeatPosition.TWO);
        if (rowingSeats >= 4) seats.add(SeatPosition.THREE);
        if (rowingSeats >= 5) seats.add(SeatPosition.FOUR);
        if (rowingSeats >= 6) seats.add(SeatPosition.FIVE);
        if (rowingSeats >= 7) seats.add(SeatPosition.SIX);
        if (rowingSeats >= 8) seats.add(SeatPosition.SEVEN);
        if (hasCoxswain) seats.add(SeatPosition.COX);

        return seats;
    }
}
