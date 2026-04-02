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
        validate(request);
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

    private void validate(CompetitionRequest request) {
        scoringSchemeRepository.findById(request.getScoringSchemeId())
                .filter(s -> s.isActive())
                .orElseThrow(() -> new ValidationException("Scoring scheme not found or not active"));

        qualificationSchemeRepository.findById(request.getQualificationSchemeId())
                .filter(q -> q.isActive())
                .orElseThrow(() -> new ValidationException("Qualification scheme not found or not active"));

        if (Boolean.FALSE.equals(request.getIsTemplate())) {
            if (request.getSeason() == null) {
                throw new ValidationException("Season is required for real competitions");
            }
            if (request.getLocation() == null || request.getLocation().isBlank()) {
                throw new ValidationException("Location is required for real competitions");
            }
            if (request.getStartDate() == null) {
                throw new ValidationException("Start date is required for real competitions");
            }
            if (request.getEndDate() == null) {
                throw new ValidationException("End date is required for real competitions");
            }

            LocalDate start = request.getStartDate();
            LocalDate end = request.getEndDate();
            if (!end.isAfter(start) && !end.isEqual(start)) {
                throw new ValidationException("End date must be on or after start date");
            }
            long actualDays = start.until(end, java.time.temporal.ChronoUnit.DAYS) + 1;
            if (actualDays != request.getDurationDays()) {
                throw new ValidationException(
                    "Duration days (" + request.getDurationDays() + ") must match the number of days between start and end date (" + actualDays + ")");
            }
        }
    }

}
