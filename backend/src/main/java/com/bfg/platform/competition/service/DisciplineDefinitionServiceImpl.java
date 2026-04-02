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
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;
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
public class DisciplineDefinitionServiceImpl implements DisciplineDefinitionService {

    private final DisciplineDefinitionRepository repository;
    private final CompetitionGroupDefinitionRepository groupRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<DisciplineDefinitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<DisciplineDefinition> filterResult =
                DisciplineDefinitionQueryAdapter.parseFilter(filter, null);
        Specification<DisciplineDefinition> filterSpec = filterResult.getSpecification();
        Specification<DisciplineDefinition> searchSpec = DisciplineDefinitionQueryAdapter.parseSearch(search);
        Specification<DisciplineDefinition> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = DisciplineDefinitionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(DisciplineDefinitionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DisciplineDefinitionDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(DisciplineDefinitionMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<DisciplineDefinitionDto> create(DisciplineDefinitionRequest request) {
        validateCrewSize(request);
        validateAgainstGroup(request);
        DisciplineDefinition entity = DisciplineDefinitionMapper.fromCreateRequest(request);
        DisciplineDefinition saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(DisciplineDefinitionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<DisciplineDefinitionDto> update(UUID uuid, DisciplineDefinitionRequest request) {
        validateCrewSize(request);
        validateAgainstGroup(request);
        return repository.findById(uuid)
                .map(entity -> {
                    DisciplineDefinitionMapper.updateFromRequest(entity, request);
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

    private void validateAgainstGroup(DisciplineDefinitionRequest request) {
        CompetitionGroupDefinition group = groupRepository.findById(request.getCompetitionGroupId())
                .orElseThrow(() -> new ValidationException("Competition group not found: " + request.getCompetitionGroupId()));

        if (!group.isActive()) {
            throw new ValidationException("Competition group is not active: " + request.getCompetitionGroupId());
        }

        if (request.getHasCoxswain()) {
            if (group.getCoxRequiredWeightKg() == null || group.getCoxMinWeightKg() == null) {
                throw new ValidationException("Cannot set hasCoxswain=true: competition group has no cox weight data configured");
            }
        }

        if (request.getIsLightweight()) {
            if (group.getLightMaxWeightKg() == null) {
                throw new ValidationException("Cannot set isLightweight=true: competition group has no lightweight weight limit configured");
            }
        }

        if (request.getMaxCrewFromTransfer() > 0) {
            if (group.getTransferFromGroupId() == null || group.getMinCrewForTransfer() == null || group.getTransferRatio() == null || group.getTransferRounding() == null) {
                throw new ValidationException("Cannot set maxCrewFromTransfer: competition group has no transfer data configured");
            }
        }
    }

    private void validateCrewSize(DisciplineDefinitionRequest request) {
        if (request.getMaxCrewFromTransfer() > request.getCrewSize()) {
            throw new ValidationException("Max crew from transfer cannot exceed crew size");
        }
    }
}
