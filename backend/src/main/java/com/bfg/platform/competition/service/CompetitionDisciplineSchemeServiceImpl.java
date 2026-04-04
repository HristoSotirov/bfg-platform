package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import com.bfg.platform.competition.mapper.CompetitionDisciplineSchemeMapper;
import com.bfg.platform.competition.query.CompetitionDisciplineSchemeQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionDisciplineSchemeRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionDisciplineSchemeServiceImpl implements CompetitionDisciplineSchemeService {

    private final CompetitionDisciplineSchemeRepository repository;
    private final DisciplineDefinitionRepository disciplineRepository;
    private final CompetitionTimetableEventRepository timetableEventRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionDisciplineSchemeDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, CompetitionDisciplineScheme.class);
        EnhancedFilterExpressionParser.ParseResult<CompetitionDisciplineScheme> filterResult =
                CompetitionDisciplineSchemeQueryAdapter.parseFilter(filter, requestedExpand);
        Specification<CompetitionDisciplineScheme> spec = filterResult.getSpecification();

        Sort sort = CompetitionDisciplineSchemeQueryAdapter.parseSort(orderBy, requestedExpand).getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        Page<CompetitionDisciplineScheme> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<CompetitionDisciplineScheme> entityGraph =
                    DynamicEntityGraph.create(entityManager, CompetitionDisciplineScheme.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = repository.findAll(spec, pageable);
        }

        return page.map(e -> CompetitionDisciplineSchemeMapper.toDto(e, requestedExpand));
    }

    private Page<CompetitionDisciplineScheme> findAllWithEntityGraph(
            Specification<CompetitionDisciplineScheme> spec,
            Pageable pageable,
            EntityGraph<CompetitionDisciplineScheme> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<CompetitionDisciplineScheme> query = cb.createQuery(CompetitionDisciplineScheme.class);
        Root<CompetitionDisciplineScheme> root = query.from(CompetitionDisciplineScheme.class);

        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        if (predicate != null) {
            query.where(predicate);
        }

        if (pageable.getSort().isSorted()) {
            List<jakarta.persistence.criteria.Order> orders = new ArrayList<>();
            pageable.getSort().forEach(order -> {
                jakarta.persistence.criteria.Path<?> path = resolvePath(root, order.getProperty());
                if (order.isAscending()) {
                    orders.add(cb.asc(path));
                } else {
                    orders.add(cb.desc(path));
                }
            });
            query.orderBy(orders);
        }

        TypedQuery<CompetitionDisciplineScheme> typedQuery = entityManager.createQuery(query);
        typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<CompetitionDisciplineScheme> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<CompetitionDisciplineScheme> countRoot = countQuery.from(CompetitionDisciplineScheme.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(content, pageable, total);
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
        long timetableCount = timetableEventRepository.countByCompetitionIdAndDisciplineId(
                entity.getCompetitionId(), entity.getDisciplineId());
        if (timetableCount > 0) {
            throw new ValidationException("Cannot remove discipline: it is referenced by " + timetableCount + " timetable event(s)");
        }
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

    private jakarta.persistence.criteria.Path<?> resolvePath(Root<CompetitionDisciplineScheme> root, String property) {
        String[] parts = property.split("\\.");
        jakarta.persistence.criteria.Path<?> path = root;
        for (String part : parts) {
            path = path.get(part);
        }
        return path;
    }
}
