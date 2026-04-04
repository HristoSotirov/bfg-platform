package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.mapper.CompetitionMapper;
import com.bfg.platform.competition.query.CompetitionQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionRequest;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionServiceImpl implements CompetitionService {

    private final CompetitionRepository repository;
    private final ScoringSchemeRepository scoringSchemeRepository;
    private final QualificationSchemeRepository qualificationSchemeRepository;
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
    public Optional<CompetitionDto> create(CompetitionRequest request) {
        validateCreate(request);
        Competition entity = CompetitionMapper.fromRequest(request);
        Competition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionDto> update(UUID uuid, CompetitionRequest request) {
        validate(request);
        return repository.findById(uuid)
                .map(entity -> {
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

    private void validateCreate(CompetitionRequest request) {
        if (request.getStatus() == null) {
            throw new ValidationException("Status is required");
        }
        String statusValue = request.getStatus().getValue();
        if (!"DRAFT".equals(statusValue) && !"PLANNED".equals(statusValue)) {
            throw new ValidationException("Status must be DRAFT or PLANNED");
        }
        validate(request);
    }

    private void validate(CompetitionRequest request) {
        scoringSchemeRepository.findById(request.getScoringSchemeId())
                .filter(s -> s.isActive())
                .orElseThrow(() -> new ValidationException("Scoring scheme not found or not active"));

        qualificationSchemeRepository.findById(request.getQualificationSchemeId())
                .filter(q -> q.isActive())
                .orElseThrow(() -> new ValidationException("Qualification scheme not found or not active"));

        // location is required for all competitions (templates and real)
        if (request.getLocation() == null || request.getLocation().isBlank()) {
            throw new ValidationException("Location is required");
        }

        // status is required
        if (request.getStatus() == null) {
            throw new ValidationException("Status is required");
        }

        boolean isDraft = "DRAFT".equals(request.getStatus().getValue());
        if (!isDraft) {
            if (request.getEntrySubmissionsOpenAt() == null) {
                throw new ValidationException("Entry submissions open date/time is required");
            }
            if (request.getEntrySubmissionsClosedAt() == null) {
                throw new ValidationException("Entry submissions closed date/time is required");
            }
            if (request.getLastChangesBeforeTmAt() == null) {
                throw new ValidationException("Last changes before TM date/time is required");
            }
            if (request.getTechnicalMeetingAt() == null) {
                throw new ValidationException("Technical meeting date/time is required");
            }
        }

        // startDate and endDate are required for all competitions (templates and real)
        if (request.getStartDate() == null) {
            throw new ValidationException("Start date is required");
        }
        if (request.getEndDate() == null) {
            throw new ValidationException("End date is required");
        }

        LocalDate start = request.getStartDate();
        LocalDate end = request.getEndDate();
        if (!end.isAfter(start) && !end.isEqual(start)) {
            throw new ValidationException("End date must be on or after start date");
        }

        if (request.getEntrySubmissionsOpenAt() != null && request.getEntrySubmissionsClosedAt() != null
                && request.getLastChangesBeforeTmAt() != null && request.getTechnicalMeetingAt() != null) {
            // Chronological order: submissionsOpen < submissionsClosed < lastChangesTM < technicalMeeting < startDate
            Instant submissionsOpen = request.getEntrySubmissionsOpenAt().toInstant();
            Instant submissionsClosed = request.getEntrySubmissionsClosedAt().toInstant();
            Instant lastChangesTm = request.getLastChangesBeforeTmAt().toInstant();
            Instant technicalMeeting = request.getTechnicalMeetingAt().toInstant();
            Instant startInstant = start.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();

            if (!submissionsOpen.isBefore(submissionsClosed)) {
                throw new ValidationException("Entry submissions open date/time must be before entry submissions closed date/time");
            }
            if (!submissionsClosed.isBefore(lastChangesTm)) {
                throw new ValidationException("Entry submissions closed date/time must be before last changes before TM date/time");
            }
            if (!lastChangesTm.isBefore(technicalMeeting)) {
                throw new ValidationException("Last changes before TM date/time must be before technical meeting date/time");
            }
            if (!technicalMeeting.isBefore(startInstant)) {
                throw new ValidationException("Technical meeting date/time must be before competition start date");
            }
        }
    }

}
