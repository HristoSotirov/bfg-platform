package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationTier;
import com.bfg.platform.competition.mapper.QualificationTierMapper;
import com.bfg.platform.competition.query.QualificationTierQueryAdapter;
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
import com.bfg.platform.gen.model.QualificationTierDto;
import com.bfg.platform.gen.model.QualificationTierRequest;
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
public class QualificationTierServiceImpl implements QualificationTierService {

    private final QualificationTierRepository repository;
    private final QualificationProgressionRepository progressionRepository;
    private final QualificationSchemeRepository schemeRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<QualificationTierDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<QualificationTier> filterResult =
                QualificationTierQueryAdapter.parseFilter(filter, null);
        Specification<QualificationTier> filterSpec = filterResult.getSpecification();
        Specification<QualificationTier> searchSpec = QualificationTierQueryAdapter.parseSearch(search);
        Specification<QualificationTier> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = QualificationTierQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(QualificationTierMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QualificationTierDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(QualificationTierMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<QualificationTierDto> create(QualificationTierRequest request) {
        validateTierRequest(request);

        QualificationTier entity = QualificationTierMapper.fromRequest(request);
        QualificationTier saved = repository.save(entity);
        entityManager.flush();

        generateProgressions(saved);

        return Optional.of(QualificationTierMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<QualificationTierDto> update(UUID uuid, QualificationTierRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    validateTierRequestBasic(request);
                    validateBoatCountRangeForUpdate(request, entity);

                    boolean roundCountChanged =
                            entity.getHeatCount() != request.getHeatCount() ||
                            entity.getSemiFinalCount() != request.getSemiFinalCount() ||
                            entity.getFinalBCount() != request.getFinalBCount() ||
                            entity.getFinalACount() != request.getFinalACount();

                    QualificationTierMapper.updateFromRequest(entity, request);
                    QualificationTier saved = repository.save(entity);
                    entityManager.flush();

                    if (roundCountChanged) {
                        progressionRepository.deleteByQualificationTierId(saved.getId());
                        entityManager.flush();
                        generateProgressions(saved);
                    }

                    return QualificationTierMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        QualificationTier entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification tier", uuid));

        validateIsLastTier(entity);

        try {
            repository.delete(entity);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateIsLastTier(QualificationTier entity) {
        List<QualificationTier> tiers = repository.findByQualificationSchemeIdOrderByBoatCountMinAsc(
                entity.getQualificationSchemeId());
        if (tiers.isEmpty()) return;
        QualificationTier lastTier = tiers.get(tiers.size() - 1);
        if (!lastTier.getId().equals(entity.getId())) {
            throw new ValidationException(
                    "Only the last tier can be deleted. " +
                    "Current last range: " + lastTier.getBoatCountMin() + "-" + lastTier.getBoatCountMax());
        }
    }

    private void validateTierRequest(QualificationTierRequest request) {
        validateTierRequestBasic(request);
        validateBoatCountRange(request);
    }

    private void validateTierRequestBasic(QualificationTierRequest request) {
        if (request.getBoatCountMin() > request.getBoatCountMax()) {
            throw new ValidationException("boatCountMin must be <= boatCountMax");
        }
        if (request.getSemiFinalCount() > 0 && request.getHeatCount() <= 0) {
            throw new ValidationException("If semiFinalCount > 0, heatCount must be > 0");
        }
    }

    private void validateBoatCountRange(QualificationTierRequest request) {
        int laneCount = getScheme(request.getQualificationSchemeId()).getLaneCount();
        List<QualificationTier> existingTiers = repository.findByQualificationSchemeIdOrderByBoatCountMinAsc(
                request.getQualificationSchemeId());
        int nextIndex = existingTiers.size();
        int expectedMin = (nextIndex * laneCount) + 1;
        int expectedMax = (nextIndex + 1) * laneCount;

        if (request.getBoatCountMin() != expectedMin || request.getBoatCountMax() != expectedMax) {
            throw new ValidationException(
                    "Invalid range " + request.getBoatCountMin() + "-" + request.getBoatCountMax() +
                    ". Next expected range: " + expectedMin + "-" + expectedMax);
        }
    }

    private void validateBoatCountRangeForUpdate(QualificationTierRequest request, QualificationTier existingEntity) {
        int laneCount = getScheme(request.getQualificationSchemeId()).getLaneCount();
        List<QualificationTier> existingTiers = repository.findByQualificationSchemeIdOrderByBoatCountMinAsc(
                request.getQualificationSchemeId());

        int tierIndex = -1;
        for (int i = 0; i < existingTiers.size(); i++) {
            if (existingTiers.get(i).getId().equals(existingEntity.getId())) {
                tierIndex = i;
                break;
            }
        }
        if (tierIndex < 0) {
            throw new ValidationException("Tier not found in scheme");
        }

        int expectedMin = (tierIndex * laneCount) + 1;
        int expectedMax = (tierIndex + 1) * laneCount;

        if (request.getBoatCountMin() != expectedMin || request.getBoatCountMax() != expectedMax) {
            throw new ValidationException(
                    "Invalid range " + request.getBoatCountMin() + "-" + request.getBoatCountMax() +
                    ". Expected range for position " + (tierIndex + 1) + ": " + expectedMin + "-" + expectedMax);
        }
    }

    private QualificationScheme getScheme(UUID schemeId) {
        return schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ValidationException("Qualification scheme not found: " + schemeId));
    }

    private void generateProgressions(QualificationTier tier) {
        if (tier.getHeatCount() > 0 && tier.getSemiFinalCount() > 0) {
            createProgression(tier.getId(), QualificationEventType.H, QualificationEventType.SF);
        }
        if (tier.getHeatCount() > 0 && tier.getSemiFinalCount() == 0 && tier.getFinalACount() > 0) {
            createProgression(tier.getId(), QualificationEventType.H, QualificationEventType.FA);
        }
        if (tier.getHeatCount() > 0 && tier.getSemiFinalCount() == 0 && tier.getFinalBCount() > 0) {
            createProgression(tier.getId(), QualificationEventType.H, QualificationEventType.FB);
        }
        if (tier.getSemiFinalCount() > 0 && tier.getFinalACount() > 0) {
            createProgression(tier.getId(), QualificationEventType.SF, QualificationEventType.FA);
        }
        if (tier.getSemiFinalCount() > 0 && tier.getFinalBCount() > 0) {
            createProgression(tier.getId(), QualificationEventType.SF, QualificationEventType.FB);
        }
    }

    private void createProgression(UUID tierId, QualificationEventType sourceEvent, QualificationEventType destEvent) {
        QualificationProgression progression = new QualificationProgression();
        progression.setQualificationTierId(tierId);
        progression.setSourceEvent(sourceEvent);
        progression.setDestEvent(destEvent);
        progression.setQualifyByPosition(0);
        progression.setQualifyByTime(0);
        progressionRepository.save(progression);
    }
}
