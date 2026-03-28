package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionEventTimetableTemplate;
import com.bfg.platform.competition.mapper.CompetitionEventTimetableTemplateMapper;
import com.bfg.platform.competition.query.CompetitionEventTimetableTemplateQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionEventTimetableTemplateRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateDto;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateUpdateRequest;
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
public class CompetitionEventTimetableTemplateServiceImpl implements CompetitionEventTimetableTemplateService {

    private final CompetitionEventTimetableTemplateRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionEventTimetableTemplateDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionEventTimetableTemplate> filterResult =
                CompetitionEventTimetableTemplateQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionEventTimetableTemplate> filterSpec = filterResult.getSpecification();
        Specification<CompetitionEventTimetableTemplate> spec = Specification.where(filterSpec);

        EnhancedSortParser.ParseResult sortResult = CompetitionEventTimetableTemplateQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionEventTimetableTemplateMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionEventTimetableTemplateDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionEventTimetableTemplateMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionEventTimetableTemplateDto> create(CompetitionEventTimetableTemplateCreateRequest request) {
        CompetitionEventTimetableTemplate entity = CompetitionEventTimetableTemplateMapper.fromCreateRequest(request);
        CompetitionEventTimetableTemplate saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionEventTimetableTemplateMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionEventTimetableTemplateDto> update(UUID uuid, CompetitionEventTimetableTemplateUpdateRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    CompetitionEventTimetableTemplateMapper.updateFromRequest(entity, request);
                    CompetitionEventTimetableTemplate saved = repository.save(entity);
                    return CompetitionEventTimetableTemplateMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionEventTimetableTemplate entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition event timetable template", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }
}
