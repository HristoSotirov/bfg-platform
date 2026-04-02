package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.mapper.CompetitionDisciplineSchemeMapper;
import com.bfg.platform.competition.query.CompetitionDisciplineSchemeQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionDisciplineSchemeRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionDisciplineSchemeServiceImpl implements CompetitionDisciplineSchemeService {

    private final CompetitionDisciplineSchemeRepository repository;
    private final DisciplineDefinitionRepository disciplineRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionDisciplineSchemeDto> getAll(String filter, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionDisciplineScheme> filterResult =
                CompetitionDisciplineSchemeQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionDisciplineScheme> spec = filterResult.getSpecification();

        Sort sort = CompetitionDisciplineSchemeQueryAdapter.parseSort(null);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionDisciplineSchemeMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionDisciplineSchemeDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionDisciplineSchemeMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionDisciplineSchemeDto> create(CompetitionDisciplineSchemeRequest request) {
        validateDisciplineActive(request.getDisciplineId());
        CompetitionDisciplineScheme entity = CompetitionDisciplineSchemeMapper.fromRequest(request);
        CompetitionDisciplineScheme saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionDisciplineSchemeMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionDisciplineSchemeDto> update(UUID uuid, CompetitionDisciplineSchemeRequest request) {
        validateDisciplineActive(request.getDisciplineId());
        return repository.findById(uuid)
                .map(entity -> {
                    CompetitionDisciplineSchemeMapper.updateFromRequest(entity, request);
                    CompetitionDisciplineScheme saved = repository.save(entity);
                    return CompetitionDisciplineSchemeMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionDisciplineScheme entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition discipline scheme", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateDisciplineActive(UUID disciplineId) {
        DisciplineDefinition discipline = disciplineRepository.findById(disciplineId)
                .orElseThrow(() -> new ResourceNotFoundException("Discipline definition", disciplineId));
        if (!discipline.isActive()) {
            throw new ValidationException("Discipline is not active: " + disciplineId);
        }
    }
}
