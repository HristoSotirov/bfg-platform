package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.ScoringScheme;
import com.bfg.platform.competition.mapper.ScoringSchemeMapper;
import com.bfg.platform.competition.query.ScoringSchemeQueryAdapter;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.ScoringSchemeDto;
import com.bfg.platform.gen.model.ScoringSchemeRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ScoringSchemeServiceImpl implements ScoringSchemeService {

    private final ScoringSchemeRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<ScoringSchemeDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<ScoringScheme> filterResult =
                ScoringSchemeQueryAdapter.parseFilter(filter, null);
        Specification<ScoringScheme> filterSpec = filterResult.getSpecification();
        Specification<ScoringScheme> searchSpec = ScoringSchemeQueryAdapter.parseSearch(search);
        Specification<ScoringScheme> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = ScoringSchemeQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(ScoringSchemeMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ScoringSchemeDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(ScoringSchemeMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<ScoringSchemeDto> create(ScoringSchemeRequest request) {
        ScoringScheme entity = ScoringSchemeMapper.fromRequest(request);
        ScoringScheme saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(ScoringSchemeMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<ScoringSchemeDto> update(UUID uuid, ScoringSchemeRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    ScoringSchemeMapper.updateFromRequest(entity, request);
                    ScoringScheme saved = repository.save(entity);
                    return ScoringSchemeMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        ScoringScheme entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Scoring scheme", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }
}
