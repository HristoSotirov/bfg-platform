package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.mapper.QualificationSchemeMapper;
import com.bfg.platform.competition.query.QualificationSchemeQueryAdapter;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationTierRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.QualificationSchemeDto;
import com.bfg.platform.gen.model.QualificationSchemeRequest;
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
public class QualificationSchemeServiceImpl implements QualificationSchemeService {

    private final QualificationSchemeRepository repository;
    private final QualificationTierRepository tierRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<QualificationSchemeDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<QualificationScheme> filterResult =
                QualificationSchemeQueryAdapter.parseFilter(filter, null);
        Specification<QualificationScheme> filterSpec = filterResult.getSpecification();
        Specification<QualificationScheme> searchSpec = QualificationSchemeQueryAdapter.parseSearch(search);
        Specification<QualificationScheme> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = QualificationSchemeQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(QualificationSchemeMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QualificationSchemeDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(QualificationSchemeMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<QualificationSchemeDto> create(QualificationSchemeRequest request) {
        QualificationScheme entity = QualificationSchemeMapper.fromRequest(request);
        QualificationScheme saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(QualificationSchemeMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<QualificationSchemeDto> update(UUID uuid, QualificationSchemeRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    validateLaneCountChange(entity, request);
                    QualificationSchemeMapper.updateFromRequest(entity, request);
                    QualificationScheme saved = repository.save(entity);
                    return QualificationSchemeMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        QualificationScheme entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification scheme", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateLaneCountChange(QualificationScheme entity, QualificationSchemeRequest request) {
        if (entity.getLaneCount() != request.getLaneCount()) {
            boolean hasTiers = !tierRepository.findByQualificationSchemeIdOrderByBoatCountMinAsc(entity.getId()).isEmpty();
            if (hasTiers) {
                throw new ValidationException(
                        "Cannot change lane count from " + entity.getLaneCount() +
                        " to " + request.getLaneCount() +
                        " because this scheme already has tiers configured. " +
                        "Delete all tiers first, then change the lane count.");
            }
        }
    }
}
