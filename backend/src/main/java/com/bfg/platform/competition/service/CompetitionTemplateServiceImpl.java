package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionTemplate;
import com.bfg.platform.competition.mapper.CompetitionTemplateMapper;
import com.bfg.platform.competition.query.CompetitionTemplateQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionTemplateRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDto;
import com.bfg.platform.gen.model.CompetitionTemplateUpdateRequest;
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
public class CompetitionTemplateServiceImpl implements CompetitionTemplateService {

    private final CompetitionTemplateRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionTemplateDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionTemplate> filterResult =
                CompetitionTemplateQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionTemplate> filterSpec = filterResult.getSpecification();
        Specification<CompetitionTemplate> searchSpec = CompetitionTemplateQueryAdapter.parseSearch(search);
        Specification<CompetitionTemplate> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = CompetitionTemplateQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionTemplateMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionTemplateDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionTemplateMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionTemplateDto> create(CompetitionTemplateCreateRequest request) {
        CompetitionTemplate entity = CompetitionTemplateMapper.fromCreateRequest(request);
        CompetitionTemplate saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionTemplateMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionTemplateDto> update(UUID uuid, CompetitionTemplateUpdateRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    CompetitionTemplateMapper.updateFromRequest(entity, request);
                    CompetitionTemplate saved = repository.save(entity);
                    return CompetitionTemplateMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionTemplate entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition template", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }
}
