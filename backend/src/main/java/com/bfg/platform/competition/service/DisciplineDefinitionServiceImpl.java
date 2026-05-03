package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.mapper.DisciplineDefinitionMapper;
import com.bfg.platform.competition.query.DisciplineDefinitionQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionGroupDefinitionRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import com.bfg.platform.gen.model.BoatClass;
import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;
import com.bfg.platform.gen.model.DisciplineGender;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class DisciplineDefinitionServiceImpl implements DisciplineDefinitionService {

    private final DisciplineDefinitionRepository repository;
    private final CompetitionGroupDefinitionRepository groupRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<DisciplineDefinitionDto> getAll(String filter, String search, List<String> orderBy,
                                                 Integer top, Integer skip, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, DisciplineDefinition.class);

        EnhancedFilterExpressionParser.ParseResult<DisciplineDefinition> filterResult =
                DisciplineDefinitionQueryAdapter.parseFilter(filter, null);
        Specification<DisciplineDefinition> filterSpec = filterResult.getSpecification();
        Specification<DisciplineDefinition> searchSpec = DisciplineDefinitionQueryAdapter.parseSearch(search);
        Specification<DisciplineDefinition> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = DisciplineDefinitionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        Page<DisciplineDefinition> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<DisciplineDefinition> entityGraph =
                    DynamicEntityGraph.create(entityManager, DisciplineDefinition.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = repository.findAll(spec, pageable);
        }

        return page.map(e -> DisciplineDefinitionMapper.toDto(e, requestedExpand));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DisciplineDefinitionDto> getByUuid(UUID uuid, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, DisciplineDefinition.class);

        DisciplineDefinition entity;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<DisciplineDefinition> entityGraph =
                    DynamicEntityGraph.create(entityManager, DisciplineDefinition.class, requestedExpand);
            java.util.Map<String, Object> hints = new java.util.HashMap<>();
            hints.put("jakarta.persistence.loadgraph", entityGraph);
            entity = entityManager.find(DisciplineDefinition.class, uuid, hints);
        } else {
            entity = repository.findById(uuid).orElse(null);
        }

        return Optional.ofNullable(entity)
                .map(e -> DisciplineDefinitionMapper.toDto(e, requestedExpand));
    }

    @Override
    @Transactional
    public Optional<DisciplineDefinitionDto> create(DisciplineDefinitionRequest request) {
        DisciplineDefinitionMapper.BoatClassFields fields = resolveBoatClassFields(request.getBoatClass());
        validateCrewSize(fields.crewSize(), request.getMaxCrewFromTransfer());
        validateAgainstGroup(request, fields);
        DisciplineDefinition entity = DisciplineDefinitionMapper.fromCreateRequest(request, fields);
        DisciplineDefinition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(DisciplineDefinitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<DisciplineDefinitionDto> update(UUID uuid, DisciplineDefinitionRequest request) {
        DisciplineDefinitionMapper.BoatClassFields fields = resolveBoatClassFields(request.getBoatClass());
        validateCrewSize(fields.crewSize(), request.getMaxCrewFromTransfer());
        validateAgainstGroup(request, fields);
        return repository.findById(uuid)
                .map(entity -> {
                    DisciplineDefinitionMapper.updateFromRequest(entity, request, fields);
                    DisciplineDefinition saved = repository.save(entity);
                    return DisciplineDefinitionMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        DisciplineDefinition entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Discipline definition", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateAgainstGroup(DisciplineDefinitionRequest request, DisciplineDefinitionMapper.BoatClassFields fields) {
        CompetitionGroupDefinition group = groupRepository.findById(request.getCompetitionGroupId())
                .orElseThrow(() -> new ValidationException("Competition group not found: " + request.getCompetitionGroupId()));

        if (!group.isActive()) {
            throw new ValidationException("Competition group is not active: " + request.getCompetitionGroupId());
        }

        DisciplineGender gender = request.getGender();

        if (gender == DisciplineGender.MIXED
                && (request.getBoatClass() == BoatClass.SINGLE_SCULL || request.getBoatClass() == BoatClass.ERGO)) {
            throw new ValidationException("Cannot create MIXED discipline for boat class " + request.getBoatClass());
        }

        boolean needsMale = gender == DisciplineGender.MALE || gender == DisciplineGender.MIXED;
        boolean needsFemale = gender == DisciplineGender.FEMALE || gender == DisciplineGender.MIXED;

        if (fields.hasCoxswain()) {
            if (needsMale && (group.getMaleTeamCoxRequiredWeightKg() == null || group.getMaleTeamCoxMinWeightKg() == null)) {
                throw new ValidationException("Cannot set hasCoxswain=true for " + gender + " discipline: group has no male team cox weight data configured");
            }
            if (needsFemale && (group.getFemaleTeamCoxRequiredWeightKg() == null || group.getFemaleTeamCoxMinWeightKg() == null)) {
                throw new ValidationException("Cannot set hasCoxswain=true for " + gender + " discipline: group has no female team cox weight data configured");
            }
        }

        if (request.getIsLightweight()) {
            if (needsMale && group.getMaleTeamLightMaxWeightKg() == null) {
                throw new ValidationException("Cannot set isLightweight=true for " + gender + " discipline: group has no male team lightweight weight limit configured");
            }
            if (needsFemale && group.getFemaleTeamLightMaxWeightKg() == null) {
                throw new ValidationException("Cannot set isLightweight=true for " + gender + " discipline: group has no female team lightweight weight limit configured");
            }
        }

        if (request.getMaxCrewFromTransfer() > 0) {
            if (group.getTransferFromGroupId() == null || group.getMinCrewForTransfer() == null || group.getTransferRatio() == null || group.getTransferRounding() == null) {
                throw new ValidationException("Cannot set maxCrewFromTransfer: competition group has no transfer data configured");
            }
        }
    }

    private void validateCrewSize(int crewSize, int maxCrewFromTransfer) {
        if (maxCrewFromTransfer > crewSize) {
            throw new ValidationException("Max crew from transfer cannot exceed crew size");
        }
    }

    private static DisciplineDefinitionMapper.BoatClassFields resolveBoatClassFields(BoatClass boatClass) {
        return switch (boatClass) {
            case SINGLE_SCULL -> new DisciplineDefinitionMapper.BoatClassFields(1, false);
            case DOUBLE_SCULL -> new DisciplineDefinitionMapper.BoatClassFields(2, false);
            case COXED_PAIR   -> new DisciplineDefinitionMapper.BoatClassFields(2, true);
            case PAIR         -> new DisciplineDefinitionMapper.BoatClassFields(2, false);
            case QUAD         -> new DisciplineDefinitionMapper.BoatClassFields(4, false);
            case COXED_QUAD   -> new DisciplineDefinitionMapper.BoatClassFields(4, true);
            case COXED_FOUR   -> new DisciplineDefinitionMapper.BoatClassFields(4, true);
            case FOUR         -> new DisciplineDefinitionMapper.BoatClassFields(4, false);
            case EIGHT        -> new DisciplineDefinitionMapper.BoatClassFields(8, true);
            case ERGO         -> new DisciplineDefinitionMapper.BoatClassFields(1, false);
        };
    }

    private Page<DisciplineDefinition> findAllWithEntityGraph(
            Specification<DisciplineDefinition> spec,
            Pageable pageable,
            EntityGraph<DisciplineDefinition> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<DisciplineDefinition> query = cb.createQuery(DisciplineDefinition.class);
        Root<DisciplineDefinition> root = query.from(DisciplineDefinition.class);

        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        if (predicate != null) {
            query.where(predicate);
        }

        if (pageable.getSort().isSorted()) {
            List<jakarta.persistence.criteria.Order> orders = new java.util.ArrayList<>();
            pageable.getSort().forEach(order -> {
                jakarta.persistence.criteria.Path<?> path = root.get(order.getProperty());
                orders.add(order.isAscending() ? cb.asc(path) : cb.desc(path));
            });
            query.orderBy(orders);
        }

        TypedQuery<DisciplineDefinition> typedQuery = entityManager.createQuery(query);
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<DisciplineDefinition> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<DisciplineDefinition> countRoot = countQuery.from(DisciplineDefinition.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new org.springframework.data.domain.PageImpl<>(content, pageable, total);
    }
}
