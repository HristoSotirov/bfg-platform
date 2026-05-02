package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationTier;
import com.bfg.platform.competition.mapper.QualificationProgressionMapper;
import com.bfg.platform.competition.query.QualificationProgressionQueryAdapter;
import com.bfg.platform.competition.repository.QualificationProgressionRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationTierRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.QualificationProgressionDto;
import com.bfg.platform.gen.model.QualificationProgressionRequest;
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
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class QualificationProgressionServiceImpl implements QualificationProgressionService {

    private static final Set<String> VALID_FLOWS = Set.of(
            "H->SF", "H->FA", "H->FB", "SF->FA", "SF->FB"
    );

    private final QualificationProgressionRepository repository;
    private final QualificationTierRepository tierRepository;
    private final QualificationSchemeRepository schemeRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<QualificationProgressionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<QualificationProgression> filterResult =
                QualificationProgressionQueryAdapter.parseFilter(filter, null);
        Specification<QualificationProgression> filterSpec = filterResult.getSpecification();
        Specification<QualificationProgression> searchSpec = QualificationProgressionQueryAdapter.parseSearch(search);
        Specification<QualificationProgression> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = QualificationProgressionQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(QualificationProgressionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QualificationProgressionDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(QualificationProgressionMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<QualificationProgressionDto> create(QualificationProgressionRequest request) {
        QualificationTier tier = tierRepository.findById(request.getQualificationTierId())
                .orElseThrow(() -> new ResourceNotFoundException("Qualification tier", request.getQualificationTierId()));

        validateProgressionRequest(request, tier);

        QualificationProgression entity = QualificationProgressionMapper.fromRequest(request);
        QualificationProgression saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(QualificationProgressionMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<QualificationProgressionDto> update(UUID uuid, QualificationProgressionRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    QualificationTier tier = tierRepository.findById(request.getQualificationTierId())
                            .orElseThrow(() -> new ResourceNotFoundException("Qualification tier", request.getQualificationTierId()));

                    validateProgressionRequest(request, tier);

                    QualificationProgressionMapper.updateFromRequest(entity, request);
                    QualificationProgression saved = repository.save(entity);
                    entityManager.flush();
                    return QualificationProgressionMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        QualificationProgression entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification progression", uuid));

        try {
            repository.delete(entity);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateProgressionRequest(QualificationProgressionRequest request, QualificationTier tier) {
        String source = request.getSourceEvent();
        String dest = request.getDestEvent();

        if (source.equals(dest)) {
            throw new ValidationException("sourceEvent must not equal destEvent");
        }

        QualificationEventType sourceType = QualificationEventType.fromValue(source);
        QualificationEventType destType = QualificationEventType.fromValue(dest);

        String flow = source + "->" + dest;
        if (!VALID_FLOWS.contains(flow)) {
            throw new ValidationException("Invalid progression flow: " + flow + ". Valid flows are: H->SF, H->FA, H->FB, SF->FA, SF->FB");
        }

        validateSourceEvent(sourceType, tier);
        validateDestEvent(destType, tier);
        validateCapacity(request, tier, sourceType, destType);
    }

    private void validateSourceEvent(QualificationEventType source, QualificationTier tier) {
        switch (source) {
            case H:
                if (tier.getHeatCount() <= 0) {
                    throw new ValidationException("Source event H requires tier heatCount > 0");
                }
                break;
            case SF:
                if (tier.getSemiFinalCount() <= 0) {
                    throw new ValidationException("Source event SF requires tier semiFinalCount > 0");
                }
                break;
            default:
                throw new ValidationException("Invalid source event: " + source);
        }
    }

    private void validateDestEvent(QualificationEventType dest, QualificationTier tier) {
        switch (dest) {
            case SF:
                if (tier.getSemiFinalCount() <= 0) {
                    throw new ValidationException("Destination event SF requires tier semiFinalCount > 0");
                }
                break;
            case FA:
                if (tier.getFinalACount() <= 0) {
                    throw new ValidationException("Destination event FA requires tier finalACount > 0");
                }
                break;
            case FB:
                if (tier.getFinalBCount() <= 0) {
                    throw new ValidationException("Destination event FB requires tier finalBCount > 0");
                }
                break;
            default:
                throw new ValidationException("Invalid destination event: " + dest);
        }
    }

    private void validateCapacity(QualificationProgressionRequest request, QualificationTier tier,
                                  QualificationEventType sourceType, QualificationEventType destType) {
        if (request.getQualifyByPosition() == 0 && request.getQualifyByTime() == 0) {
            return;
        }

        QualificationScheme scheme = schemeRepository.findById(tier.getQualificationSchemeId())
                .orElseThrow(() -> new ValidationException("Qualification scheme not found"));

        int laneCount = scheme.getLaneCount();
        int sourceEventCount = getEventCount(sourceType, tier);
        int totalAdvancing = (request.getQualifyByPosition() * sourceEventCount) + request.getQualifyByTime();
        int destEventCount = getEventCount(destType, tier);
        int destCapacity = destEventCount * laneCount;

        if (totalAdvancing > destCapacity) {
            throw new ValidationException(
                    "Too many boats advancing: " + totalAdvancing +
                    " (pos=" + request.getQualifyByPosition() + " × " + sourceEventCount + " events + time=" + request.getQualifyByTime() + ")" +
                    " exceeds destination capacity: " + destCapacity +
                    " (" + destEventCount + " × " + laneCount + " lanes)");
        }
    }

    private int getEventCount(QualificationEventType event, QualificationTier tier) {
        return switch (event) {
            case H -> tier.getHeatCount();
            case SF -> tier.getSemiFinalCount();
            case FA -> tier.getFinalACount();
            case FB -> tier.getFinalBCount();
        };
    }
}
