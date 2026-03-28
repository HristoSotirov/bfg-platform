package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.QualificationRule;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationStage;
import com.bfg.platform.competition.mapper.QualificationRuleMapper;
import com.bfg.platform.competition.query.QualificationRuleQueryAdapter;
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
import com.bfg.platform.gen.model.QualificationRuleDto;
import com.bfg.platform.gen.model.QualificationRuleRequest;
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
public class QualificationRuleServiceImpl implements QualificationRuleService {

    private final QualificationRuleRepository repository;
    private final QualificationStageRepository stageRepository;
    private final QualificationSchemeRepository schemeRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<QualificationRuleDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<QualificationRule> filterResult =
                QualificationRuleQueryAdapter.parseFilter(filter, null);
        Specification<QualificationRule> filterSpec = filterResult.getSpecification();
        Specification<QualificationRule> searchSpec = QualificationRuleQueryAdapter.parseSearch(search);
        Specification<QualificationRule> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = QualificationRuleQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(QualificationRuleMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QualificationRuleDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(QualificationRuleMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<QualificationRuleDto> create(QualificationRuleRequest request) {
        validateSourceNotEqualDestination(request.getSourceStageId(), request.getDestinationStageId());
        validateRule(request);

        QualificationRule entity = QualificationRuleMapper.fromRequest(request);
        try {
            QualificationRule saved = repository.save(entity);
            entityManager.flush();
            return Optional.of(QualificationRuleMapper.toDto(saved));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    @Override
    @Transactional
    public Optional<QualificationRuleDto> update(UUID uuid, QualificationRuleRequest request) {
        validateSourceNotEqualDestination(request.getSourceStageId(), request.getDestinationStageId());
        validateRule(request);

        return repository.findById(uuid)
                .map(entity -> {
                    QualificationRuleMapper.updateFromRequest(entity, request);
                    try {
                        QualificationRule saved = repository.save(entity);
                        entityManager.flush();
                        return QualificationRuleMapper.toDto(saved);
                    } catch (DataIntegrityViolationException e) {
                        throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
                    }
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        QualificationRule entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification rule", uuid));
        try {
            repository.delete(entity);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateSourceNotEqualDestination(UUID sourceStageId, UUID destinationStageId) {
        if (sourceStageId.equals(destinationStageId)) {
            throw new ValidationException("Source and destination stages must be different");
        }
    }

    private void validateRule(QualificationRuleRequest request) {
        validateBaseNotExceedMax(request);

        if (Boolean.TRUE.equals(request.getIsRemainder())) {
            validateRemainderFieldsAreZero(request);
        } else {
            validateNonRemainderHasQualification(request);
            validateCapacityAgainstLaneCount(request);
        }
    }

    private void validateBaseNotExceedMax(QualificationRuleRequest request) {
        if (request.getBaseQualifyByTime() > request.getMaxQualifyByTime()) {
            throw new ValidationException("Base qualify by time (" + request.getBaseQualifyByTime() +
                    ") must be less than or equal to max qualify by time (" + request.getMaxQualifyByTime() + ")");
        }
    }

    private void validateRemainderFieldsAreZero(QualificationRuleRequest request) {
        if (request.getQualifyByPosition() != 0 || request.getBaseQualifyByTime() != 0 || request.getMaxQualifyByTime() != 0) {
            throw new ValidationException("Remainder rule must have qualifyByPosition, baseQualifyByTime, and maxQualifyByTime all set to 0");
        }
    }

    private void validateNonRemainderHasQualification(QualificationRuleRequest request) {
        if (request.getQualifyByPosition() <= 0 && request.getBaseQualifyByTime() <= 0) {
            throw new ValidationException("Non-remainder rule must have at least one of qualifyByPosition or baseQualifyByTime > 0");
        }
    }

    private void validateCapacityAgainstLaneCount(QualificationRuleRequest request) {
        QualificationStage sourceStage = stageRepository.findById(request.getSourceStageId()).orElse(null);
        QualificationScheme scheme = schemeRepository.findById(request.getQualificationSchemeId()).orElse(null);

        if (sourceStage == null || scheme == null) {
            return;
        }

        int totalAdvancing = (request.getQualifyByPosition() * sourceStage.getEventCount()) + request.getMaxQualifyByTime();
        int laneCount = scheme.getLaneCount();

        if (totalAdvancing > laneCount) {
            throw new ValidationException(
                    "Too many boats advancing: " + request.getQualifyByPosition() + " by position x " +
                    sourceStage.getEventCount() + " events + " + request.getMaxQualifyByTime() +
                    " max by time = " + totalAdvancing + " boats, but scheme lane count is " + laneCount);
        }
    }
}
