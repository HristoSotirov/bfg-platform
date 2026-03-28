package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionTemplateDiscipline;
import com.bfg.platform.competition.mapper.CompetitionTemplateDisciplineMapper;
import com.bfg.platform.competition.query.CompetitionTemplateDisciplineQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionTemplateDisciplineRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineDto;
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
public class CompetitionTemplateDisciplineServiceImpl implements CompetitionTemplateDisciplineService {

    private final CompetitionTemplateDisciplineRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionTemplateDisciplineDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionTemplateDiscipline> filterResult =
                CompetitionTemplateDisciplineQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionTemplateDiscipline> spec = filterResult.getSpecification();

        EnhancedSortParser.ParseResult sortResult = CompetitionTemplateDisciplineQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionTemplateDisciplineMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionTemplateDisciplineDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionTemplateDisciplineMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionTemplateDisciplineDto> create(CompetitionTemplateDisciplineCreateRequest request) {
        CompetitionTemplateDiscipline entity = CompetitionTemplateDisciplineMapper.fromCreateRequest(request);
        CompetitionTemplateDiscipline saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionTemplateDisciplineMapper.toDto(saved));
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionTemplateDiscipline entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition template discipline", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }
}
