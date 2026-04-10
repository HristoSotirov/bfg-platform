package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.mapper.CompetitionMapper;
import com.bfg.platform.competition.query.CompetitionQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationTierRepository;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionCreateRequest;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionUpdateRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionServiceImpl implements CompetitionService {

    private final CompetitionRepository repository;
    private final ScoringSchemeRepository scoringSchemeRepository;
    private final QualificationSchemeRepository qualificationSchemeRepository;
    private final QualificationTierRepository qualificationTierRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<Competition> filterResult =
                CompetitionQueryAdapter.parseFilter(filter, null);
        Specification<Competition> filterSpec = filterResult.getSpecification();
        Specification<Competition> searchSpec = CompetitionQueryAdapter.parseSearch(search);
        Specification<Competition> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = CompetitionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionDto> create(CompetitionCreateRequest request) {
        validateCreate(request);
        Competition entity = CompetitionMapper.fromRequest(request);
        entity.setStatus("PLANNED");
        Competition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionDto> update(UUID uuid, CompetitionUpdateRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    validateUpdate(request, entity.isTemplate());
                    CompetitionMapper.updateFromRequest(entity, request);
                    Competition saved = repository.save(entity);
                    return CompetitionMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        Competition entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateCreate(CompetitionCreateRequest request) {
        validateScoringAndQualification(request.getScoringSchemeId(), request.getQualificationSchemeId(),
                request.getCompetitionType() != null ? request.getCompetitionType().getValue() : null);

        if (request.getLocation() == null || request.getLocation().isBlank()) {
            throw new ValidationException("Location is required");
        }

        boolean isTemplate = Boolean.TRUE.equals(request.getIsTemplate());
        if (!isTemplate) {
            requireDateTimes(request.getEntrySubmissionsOpenAt(), request.getEntrySubmissionsClosedAt(),
                    request.getLastChangesBeforeTmAt(), request.getTechnicalMeetingAt());
        }

        validateDates(request.getStartDate(), request.getEndDate());
        if (!isTemplate) {
            validateChronology(request.getEntrySubmissionsOpenAt(), request.getEntrySubmissionsClosedAt(),
                    request.getLastChangesBeforeTmAt(), request.getTechnicalMeetingAt(), request.getStartDate());
        }
    }

    private void validateUpdate(CompetitionUpdateRequest request, boolean isTemplate) {
        validateScoringAndQualification(request.getScoringSchemeId(), request.getQualificationSchemeId(),
                request.getCompetitionType() != null ? request.getCompetitionType().getValue() : null);

        if (request.getLocation() == null || request.getLocation().isBlank()) {
            throw new ValidationException("Location is required");
        }

        if (!isTemplate) {
            requireDateTimes(request.getEntrySubmissionsOpenAt(), request.getEntrySubmissionsClosedAt(),
                    request.getLastChangesBeforeTmAt(), request.getTechnicalMeetingAt());
        }

        validateDates(request.getStartDate(), request.getEndDate());
        if (!isTemplate) {
            validateChronology(request.getEntrySubmissionsOpenAt(), request.getEntrySubmissionsClosedAt(),
                    request.getLastChangesBeforeTmAt(), request.getTechnicalMeetingAt(), request.getStartDate());
        }
    }

    private void validateScoringAndQualification(UUID scoringSchemeId, UUID qualificationSchemeId, String compType) {
        scoringSchemeRepository.findById(scoringSchemeId)
                .filter(s -> s.isActive())
                .orElseThrow(() -> new ValidationException("Scoring scheme not found or not active"));

        qualificationSchemeRepository.findById(qualificationSchemeId)
                .filter(q -> q.isActive())
                .orElseThrow(() -> new ValidationException("Qualification scheme not found or not active"));

        if (compType != null) {
            validateQualificationSchemeForType(compType, qualificationSchemeId);
        }
    }

    private void requireDateTimes(OffsetDateTime openAt, OffsetDateTime closedAt,
                                   OffsetDateTime lastChangesTm, OffsetDateTime technicalMeeting) {
        if (openAt == null) throw new ValidationException("Entry submissions open date/time is required");
        if (closedAt == null) throw new ValidationException("Entry submissions closed date/time is required");
        if (lastChangesTm == null) throw new ValidationException("Last changes before TM date/time is required");
        if (technicalMeeting == null) throw new ValidationException("Technical meeting date/time is required");
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) throw new ValidationException("Start date is required");
        if (endDate == null) throw new ValidationException("End date is required");
        if (!endDate.isAfter(startDate) && !endDate.isEqual(startDate)) {
            throw new ValidationException("End date must be on or after start date");
        }
    }

    private void validateChronology(OffsetDateTime openAt, OffsetDateTime closedAt,
                                     OffsetDateTime lastChangesTm, OffsetDateTime technicalMeeting,
                                     LocalDate startDate) {
        if (openAt == null || closedAt == null || lastChangesTm == null || technicalMeeting == null) return;

        Instant submissionsOpen = openAt.toInstant();
        Instant submissionsClosed = closedAt.toInstant();
        Instant lastChangesTmInst = lastChangesTm.toInstant();
        Instant technicalMeetingInst = technicalMeeting.toInstant();
        Instant startInstant = startDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();

        if (!submissionsOpen.isBefore(submissionsClosed)) {
            throw new ValidationException("Entry submissions open date/time must be before entry submissions closed date/time");
        }
        if (!submissionsClosed.isBefore(lastChangesTmInst)) {
            throw new ValidationException("Entry submissions closed date/time must be before last changes before TM date/time");
        }
        if (!lastChangesTmInst.isBefore(technicalMeetingInst)) {
            throw new ValidationException("Last changes before TM date/time must be before technical meeting date/time");
        }
        if (!technicalMeetingInst.isBefore(startInstant)) {
            throw new ValidationException("Technical meeting date/time must be before competition start date");
        }
    }

    private void validateQualificationSchemeForType(String competitionType, UUID qualificationSchemeId) {
        if ("STANDARD".equals(competitionType)) return;
        boolean incompatible = qualificationTierRepository
                .findByQualificationSchemeIdOrderByBoatCountMinAsc(qualificationSchemeId)
                .stream()
                .anyMatch(t -> t.getSemiFinalCount() > 0 || t.getFinalACount() > 0 || t.getFinalBCount() > 0);
        if (incompatible) {
            throw new ValidationException(
                "Qualification scheme has SF/FA/FB tiers — not compatible with competition type " + competitionType);
        }
    }
}
