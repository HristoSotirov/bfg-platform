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
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionDto;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionRequest;
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
public class CompetitionGroupDefinitionServiceImpl implements CompetitionGroupDefinitionService {

    private final CompetitionGroupDefinitionRepository repository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionGroupDefinitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionGroupDefinition> filterResult =
                CompetitionGroupDefinitionQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionGroupDefinition> filterSpec = filterResult.getSpecification();
        Specification<CompetitionGroupDefinition> searchSpec = CompetitionGroupDefinitionQueryAdapter.parseSearch(search);
        Specification<CompetitionGroupDefinition> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = CompetitionGroupDefinitionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionGroupDefinitionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionGroupDefinitionDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionGroupDefinitionMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionGroupDefinitionDto> create(CompetitionGroupDefinitionRequest request) {
        validateAgeRange(request.getMinAge(), request.getMaxAge());
        validateTransferFields(request.getTransferFromGroupId(), request.getMinCrewForTransfer(),
                request.getTransferRatio(), request.getTransferRounding() != null ? request.getTransferRounding().name() : null);
        validateCoxWeightFields(request.getCoxMinWeightKg(), request.getCoxRequiredWeightKg());
        validateWeightOrder(request.getCoxMinWeightKg(), request.getCoxRequiredWeightKg());

        CompetitionGroupDefinition entity = CompetitionGroupDefinitionMapper.fromCreateRequest(request);
        CompetitionGroupDefinition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionGroupDefinitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionGroupDefinitionDto> update(UUID uuid, CompetitionGroupDefinitionRequest request) {
        validateAgeRange(request.getMinAge(), request.getMaxAge());
        validateTransferFields(request.getTransferFromGroupId(), request.getMinCrewForTransfer(),
                request.getTransferRatio(), request.getTransferRounding() != null ? request.getTransferRounding().name() : null);
        validateCoxWeightFields(request.getCoxMinWeightKg(), request.getCoxRequiredWeightKg());
        validateWeightOrder(request.getCoxMinWeightKg(), request.getCoxRequiredWeightKg());

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

    private void validateTransferFields(UUID transferGroupId, Integer minCrewForTransfer,
                                         Integer transferRatio, String transferRounding) {
        boolean hasAny = transferGroupId != null || minCrewForTransfer != null
                || transferRatio != null || transferRounding != null;
        boolean hasAll = transferGroupId != null && minCrewForTransfer != null
                && transferRatio != null && transferRounding != null;

        if (hasAny && !hasAll) {
            throw new ValidationException(
                    "Transfer fields must be all set or all null: transferGroupId, minCrewForTransfer, transferRatio, transferRounding");
        }
    }

    private void validateCoxWeightFields(Double coxMinWeight, Double coxRequiredWeight) {
        boolean hasAny = coxMinWeight != null || coxRequiredWeight != null;
        boolean hasAll = coxMinWeight != null && coxRequiredWeight != null;

        if (hasAny && !hasAll) {
            throw new ValidationException(
                    "Cox weight fields must be both set or both null: coxMinWeightKg, coxRequiredWeightKg");
        }
    }

    private void validateWeightOrder(Double coxMinWeight, Double coxRequiredWeight) {
        if (coxMinWeight != null && coxRequiredWeight != null && coxMinWeight > coxRequiredWeight) {
            throw new ValidationException("Cox min weight must be less than or equal to cox required weight");
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
        boolean hadCoxWeights = entity.getCoxRequiredWeightKg() != null;
        boolean removingCoxWeights = request.getCoxRequiredWeightKg() == null;
        if (hadCoxWeights && removingCoxWeights) {
            boolean disciplinesUseCox = disciplineDefinitionRepository.existsByCompetitionGroupIdAndHasCoxswain(entity.getId(), true);
            if (disciplinesUseCox) {
                throw new ValidationException("Cannot remove cox weight data: disciplines in this group have coxswain enabled");
            }
        }
    }

    private void validateLightWeightRemoval(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        boolean hadLightWeight = entity.getLightMaxWeightKg() != null;
        boolean removingLightWeight = request.getLightMaxWeightKg() == null;
        if (hadLightWeight && removingLightWeight) {
            boolean disciplinesUseLightweight = disciplineDefinitionRepository.existsByCompetitionGroupIdAndIsLightweight(entity.getId(), true);
            if (disciplinesUseLightweight) {
                throw new ValidationException("Cannot remove lightweight weight data: disciplines in this group have lightweight enabled");
            }
        }
    }
}
