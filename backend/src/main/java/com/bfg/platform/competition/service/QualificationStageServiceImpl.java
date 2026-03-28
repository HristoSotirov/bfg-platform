package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationStage;
import com.bfg.platform.competition.mapper.QualificationStageMapper;
import com.bfg.platform.competition.query.QualificationStageQueryAdapter;
import com.bfg.platform.competition.repository.QualificationRuleRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationStageRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.QualificationStageDto;
import com.bfg.platform.gen.model.QualificationStageRequest;
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
public class QualificationStageServiceImpl implements QualificationStageService {

    private final QualificationStageRepository repository;
    private final QualificationSchemeRepository schemeRepository;
    private final QualificationRuleRepository ruleRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<QualificationStageDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<QualificationStage> filterResult =
                QualificationStageQueryAdapter.parseFilter(filter, null);
        Specification<QualificationStage> filterSpec = filterResult.getSpecification();
        Specification<QualificationStage> searchSpec = QualificationStageQueryAdapter.parseSearch(search);
        Specification<QualificationStage> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = QualificationStageQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(QualificationStageMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QualificationStageDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(QualificationStageMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<QualificationStageDto> create(QualificationStageRequest request) {
        validateBoatCountRange(request.getBoatCountMin(), request.getBoatCountMax());
        validateBoatCountMatchesLaneCount(request.getQualificationSchemeId(), request.getBoatCountMin(), request.getBoatCountMax());

        QualificationStage entity = QualificationStageMapper.fromRequest(request);
        try {
            QualificationStage saved = repository.save(entity);
            entityManager.flush();
            return Optional.of(QualificationStageMapper.toDto(saved));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    @Override
    @Transactional
    public Optional<QualificationStageDto> update(UUID uuid, QualificationStageRequest request) {
        validateBoatCountRange(request.getBoatCountMin(), request.getBoatCountMax());
        validateBoatCountMatchesLaneCount(request.getQualificationSchemeId(), request.getBoatCountMin(), request.getBoatCountMax());

        return repository.findById(uuid)
                .map(entity -> {
                    QualificationStageMapper.updateFromRequest(entity, request);
                    try {
                        QualificationStage saved = repository.save(entity);
                        entityManager.flush();
                        return QualificationStageMapper.toDto(saved);
                    } catch (DataIntegrityViolationException e) {
                        throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
                    }
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        QualificationStage entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification stage", uuid));

        boolean usedInRules = ruleRepository.existsBySourceStageIdOrDestinationStageId(uuid, uuid);
        if (usedInRules) {
            throw new ConflictException("Cannot delete stage: it is referenced by qualification rules");
        }

        try {
            repository.delete(entity);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateBoatCountRange(Integer min, Integer max) {
        if (min != null && max != null && min > max) {
            throw new ValidationException("Boat count min must be less than or equal to boat count max");
        }
    }

    private void validateBoatCountMatchesLaneCount(UUID schemeId, Integer boatCountMin, Integer boatCountMax) {
        QualificationScheme scheme = schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ValidationException("Qualification scheme not found: " + schemeId));

        int laneCount = scheme.getLaneCount();

        // Valid ranges for lane count N: 1-N, N+1-2N, 2N+1-3N, 3N+1-4N...
        // First range is special: 1 to laneCount
        // Subsequent ranges: (k*laneCount)+1 to (k+1)*laneCount

        if (boatCountMin == 1) {
            // First range: must be 1 to laneCount
            if (boatCountMax != laneCount) {
                throw new ValidationException(
                        "For the first range, boat count must be 1-" + laneCount +
                        " (matching lane count " + laneCount + "), but got 1-" + boatCountMax);
            }
            return;
        }

        // Subsequent ranges: min must be k*laneCount+1, max must be (k+1)*laneCount
        if ((boatCountMin - 1) % laneCount != 0) {
            throw new ValidationException(
                    "Boat count min " + boatCountMin + " does not match lane count pattern for " +
                    laneCount + " lanes. Expected values: 1, " + (laneCount + 1) + ", " + (2 * laneCount + 1) + "...");
        }

        int expectedMax = boatCountMin - 1 + laneCount;
        if (boatCountMax != expectedMax) {
            throw new ValidationException(
                    "Boat count range " + boatCountMin + "-" + boatCountMax +
                    " does not match lane count " + laneCount +
                    ". Expected range: " + boatCountMin + "-" + expectedMax);
        }
    }
}
