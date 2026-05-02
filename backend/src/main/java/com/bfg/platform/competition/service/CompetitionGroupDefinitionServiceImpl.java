package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.mapper.CompetitionGroupDefinitionMapper;
import com.bfg.platform.competition.query.CompetitionGroupDefinitionQueryAdapter;
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
import com.bfg.platform.gen.model.CompetitionGroupDefinitionDto;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionRequest;
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
public class CompetitionGroupDefinitionServiceImpl implements CompetitionGroupDefinitionService {

    private final CompetitionGroupDefinitionRepository repository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionGroupDefinitionDto> getAll(String filter, String search, List<String> orderBy,
                                                       Integer top, Integer skip, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, CompetitionGroupDefinition.class);

        EnhancedFilterExpressionParser.ParseResult<CompetitionGroupDefinition> filterResult =
                CompetitionGroupDefinitionQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionGroupDefinition> filterSpec = filterResult.getSpecification();
        Specification<CompetitionGroupDefinition> searchSpec = CompetitionGroupDefinitionQueryAdapter.parseSearch(search);
        Specification<CompetitionGroupDefinition> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = CompetitionGroupDefinitionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        Page<CompetitionGroupDefinition> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<CompetitionGroupDefinition> entityGraph =
                    DynamicEntityGraph.create(entityManager, CompetitionGroupDefinition.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = repository.findAll(spec, pageable);
        }

        return page.map(e -> CompetitionGroupDefinitionMapper.toDto(e, requestedExpand));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionGroupDefinitionDto> getByUuid(UUID uuid, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, CompetitionGroupDefinition.class);

        CompetitionGroupDefinition entity;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<CompetitionGroupDefinition> entityGraph =
                    DynamicEntityGraph.create(entityManager, CompetitionGroupDefinition.class, requestedExpand);
            java.util.Map<String, Object> hints = new java.util.HashMap<>();
            hints.put("jakarta.persistence.loadgraph", entityGraph);
            entity = entityManager.find(CompetitionGroupDefinition.class, uuid, hints);
        } else {
            entity = repository.findById(uuid).orElse(null);
        }

        return Optional.ofNullable(entity)
                .map(e -> CompetitionGroupDefinitionMapper.toDto(e, requestedExpand));
    }

    @Override
    @Transactional
    public Optional<CompetitionGroupDefinitionDto> create(CompetitionGroupDefinitionRequest request) {
        validateAgeRange(request.getMinAge(), request.getMaxAge());
        validateCoxAgeRange(request.getCoxMinAge(), request.getCoxMaxAge());
        validateTransferFields(request.getTransferFromGroupId(), request.getMinCrewForTransfer(),
                request.getTransferRatio(), request.getTransferRounding() != null ? request.getTransferRounding().name() : null,
                request.getTransferredMaxDisciplinesPerAthlete());
        validateCoxWeightFields(request.getMaleTeamCoxMinWeightKg(), request.getMaleTeamCoxRequiredWeightKg(), "Male");
        validateCoxWeightFields(request.getFemaleTeamCoxMinWeightKg(), request.getFemaleTeamCoxRequiredWeightKg(), "Female");
        validateWeightOrder(request.getMaleTeamCoxMinWeightKg(), request.getMaleTeamCoxRequiredWeightKg(), "Male");
        validateWeightOrder(request.getFemaleTeamCoxMinWeightKg(), request.getFemaleTeamCoxRequiredWeightKg(), "Female");

        CompetitionGroupDefinition entity = CompetitionGroupDefinitionMapper.fromCreateRequest(request);
        CompetitionGroupDefinition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionGroupDefinitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionGroupDefinitionDto> update(UUID uuid, CompetitionGroupDefinitionRequest request) {
        validateAgeRange(request.getMinAge(), request.getMaxAge());
        validateCoxAgeRange(request.getCoxMinAge(), request.getCoxMaxAge());
        validateTransferFields(request.getTransferFromGroupId(), request.getMinCrewForTransfer(),
                request.getTransferRatio(), request.getTransferRounding() != null ? request.getTransferRounding().name() : null,
                request.getTransferredMaxDisciplinesPerAthlete());
        validateCoxWeightFields(request.getMaleTeamCoxMinWeightKg(), request.getMaleTeamCoxRequiredWeightKg(), "Male");
        validateCoxWeightFields(request.getFemaleTeamCoxMinWeightKg(), request.getFemaleTeamCoxRequiredWeightKg(), "Female");
        validateWeightOrder(request.getMaleTeamCoxMinWeightKg(), request.getMaleTeamCoxRequiredWeightKg(), "Male");
        validateWeightOrder(request.getFemaleTeamCoxMinWeightKg(), request.getFemaleTeamCoxRequiredWeightKg(), "Female");

        return repository.findById(uuid)
                .map(entity -> {
                    validateTransferRemoval(entity, request);
                    validateCoxWeightRemoval(entity, request);
                    validateLightWeightRemoval(entity, request);
                    CompetitionGroupDefinitionMapper.updateFromRequest(entity, request);
                    CompetitionGroupDefinition saved = repository.save(entity);
                    return CompetitionGroupDefinitionMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionGroupDefinition entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition group definition", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateAgeRange(Integer minAge, Integer maxAge) {
        if (minAge != null && maxAge != null && minAge > maxAge) {
            throw new ValidationException("Min age must be less than or equal to max age");
        }
    }

    private void validateCoxAgeRange(Integer coxMinAge, Integer coxMaxAge) {
        if (coxMinAge != null && coxMaxAge != null && coxMinAge > coxMaxAge) {
            throw new ValidationException("Cox min age must be less than or equal to cox max age");
        }
    }

    private void validateTransferFields(UUID transferGroupId, Integer minCrewForTransfer,
                                         Integer transferRatio, String transferRounding,
                                         Integer transferredMaxDisciplinesPerAthlete) {
        boolean hasAny = transferGroupId != null || minCrewForTransfer != null
                || transferRatio != null || transferRounding != null
                || transferredMaxDisciplinesPerAthlete != null;
        boolean hasAll = transferGroupId != null && minCrewForTransfer != null
                && transferRatio != null && transferRounding != null
                && transferredMaxDisciplinesPerAthlete != null;

        if (hasAny && !hasAll) {
            throw new ValidationException(
                    "Transfer fields must be all set or all null: transferGroupId, minCrewForTransfer, transferRatio, transferRounding, transferredMaxDisciplinesPerAthlete");
        }

        if (transferGroupId != null) {
            CompetitionGroupDefinition transferGroup = repository.findById(transferGroupId)
                    .orElseThrow(() -> new ValidationException("Transfer group not found: " + transferGroupId));
            if (!transferGroup.isActive()) {
                throw new ValidationException("Transfer group is not active: " + transferGroupId);
            }
        }
    }

    private void validateCoxWeightFields(Double coxMinWeight, Double coxRequiredWeight, String label) {
        boolean hasAny = coxMinWeight != null || coxRequiredWeight != null;
        boolean hasAll = coxMinWeight != null && coxRequiredWeight != null;

        if (hasAny && !hasAll) {
            throw new ValidationException(
                    label + " cox weight fields must be both set or both null");
        }
    }

    private void validateWeightOrder(Double coxMinWeight, Double coxRequiredWeight, String label) {
        if (coxMinWeight != null && coxRequiredWeight != null && coxMinWeight > coxRequiredWeight) {
            throw new ValidationException(label + " cox min weight must be less than or equal to cox required weight");
        }
    }

    private void validateTransferRemoval(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        boolean hadTransfer = entity.getTransferFromGroupId() != null;
        boolean removingTransfer = request.getTransferFromGroupId() == null;
        if (hadTransfer && removingTransfer) {
            boolean disciplinesUseTransfer = disciplineDefinitionRepository.existsByCompetitionGroupIdAndMaxCrewFromTransferGreaterThan(entity.getId(), 0);
            if (disciplinesUseTransfer) {
                throw new ValidationException("Cannot remove transfer data: disciplines in this group use transfer crew");
            }
        }
    }

    private void validateCoxWeightRemoval(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        boolean hadMaleTeamCox = entity.getMaleTeamCoxRequiredWeightKg() != null;
        boolean removingMaleTeamCox = request.getMaleTeamCoxRequiredWeightKg() == null;
        if (hadMaleTeamCox && removingMaleTeamCox) {
            boolean maleOrMixedUseCox = disciplineDefinitionRepository.existsByCompetitionGroupIdAndGenderInAndHasCoxswain(
                    entity.getId(), List.of(DisciplineGender.MALE, DisciplineGender.MIXED), true);
            if (maleOrMixedUseCox) {
                throw new ValidationException("Cannot remove male team cox weight data: MALE or MIXED disciplines in this group have coxswain enabled");
            }
        }

        boolean hadFemaleTeamCox = entity.getFemaleTeamCoxRequiredWeightKg() != null;
        boolean removingFemaleTeamCox = request.getFemaleTeamCoxRequiredWeightKg() == null;
        if (hadFemaleTeamCox && removingFemaleTeamCox) {
            boolean femaleOrMixedUseCox = disciplineDefinitionRepository.existsByCompetitionGroupIdAndGenderInAndHasCoxswain(
                    entity.getId(), List.of(DisciplineGender.FEMALE, DisciplineGender.MIXED), true);
            if (femaleOrMixedUseCox) {
                throw new ValidationException("Cannot remove female team cox weight data: FEMALE or MIXED disciplines in this group have coxswain enabled");
            }
        }
    }

    private void validateLightWeightRemoval(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        boolean hadMaleTeamLight = entity.getMaleTeamLightMaxWeightKg() != null;
        boolean removingMaleTeamLight = request.getMaleTeamLightMaxWeightKg() == null;
        if (hadMaleTeamLight && removingMaleTeamLight) {
            boolean maleOrMixedUseLightweight = disciplineDefinitionRepository.existsByCompetitionGroupIdAndGenderInAndIsLightweight(
                    entity.getId(), List.of(DisciplineGender.MALE, DisciplineGender.MIXED), true);
            if (maleOrMixedUseLightweight) {
                throw new ValidationException("Cannot remove male team lightweight weight data: MALE or MIXED disciplines in this group have lightweight enabled");
            }
        }

        boolean hadFemaleTeamLight = entity.getFemaleTeamLightMaxWeightKg() != null;
        boolean removingFemaleTeamLight = request.getFemaleTeamLightMaxWeightKg() == null;
        if (hadFemaleTeamLight && removingFemaleTeamLight) {
            boolean femaleOrMixedUseLightweight = disciplineDefinitionRepository.existsByCompetitionGroupIdAndGenderInAndIsLightweight(
                    entity.getId(), List.of(DisciplineGender.FEMALE, DisciplineGender.MIXED), true);
            if (femaleOrMixedUseLightweight) {
                throw new ValidationException("Cannot remove female team lightweight weight data: FEMALE or MIXED disciplines in this group have lightweight enabled");
            }
        }
    }

    private Page<CompetitionGroupDefinition> findAllWithEntityGraph(
            Specification<CompetitionGroupDefinition> spec,
            Pageable pageable,
            EntityGraph<CompetitionGroupDefinition> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<CompetitionGroupDefinition> query = cb.createQuery(CompetitionGroupDefinition.class);
        Root<CompetitionGroupDefinition> root = query.from(CompetitionGroupDefinition.class);

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

        TypedQuery<CompetitionGroupDefinition> typedQuery = entityManager.createQuery(query);
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<CompetitionGroupDefinition> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<CompetitionGroupDefinition> countRoot = countQuery.from(CompetitionGroupDefinition.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new org.springframework.data.domain.PageImpl<>(content, pageable, total);
    }
}
