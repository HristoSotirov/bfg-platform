package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
import com.bfg.platform.competition.mapper.ScoringSchemeBoatCoefficientMapper;
import com.bfg.platform.competition.query.ScoringSchemeBoatCoefficientQueryAdapter;
import com.bfg.platform.competition.repository.ScoringSchemeBoatCoefficientRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientDto;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ScoringSchemeBoatCoefficientServiceImpl implements ScoringSchemeBoatCoefficientService {

    private final ScoringSchemeBoatCoefficientRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<ScoringSchemeBoatCoefficientDto> getAll(String filter, Integer top, Integer skip) {
        Specification<ScoringSchemeBoatCoefficient> spec = ScoringSchemeBoatCoefficientQueryAdapter.parseFilter(filter);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, Sort.by(Sort.Direction.ASC, "id"));

        return repository.findAll(spec, pageable).map(ScoringSchemeBoatCoefficientMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ScoringSchemeBoatCoefficientDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(ScoringSchemeBoatCoefficientMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<ScoringSchemeBoatCoefficientDto> create(ScoringSchemeBoatCoefficientRequest request) {
        ScoringSchemeBoatCoefficient entity = ScoringSchemeBoatCoefficientMapper.fromRequest(request);
        ScoringSchemeBoatCoefficient saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(ScoringSchemeBoatCoefficientMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<ScoringSchemeBoatCoefficientDto> update(UUID uuid, ScoringSchemeBoatCoefficientRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    ScoringSchemeBoatCoefficientMapper.updateFromRequest(entity, request);
                    ScoringSchemeBoatCoefficient saved = repository.save(entity);
                    return ScoringSchemeBoatCoefficientMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        ScoringSchemeBoatCoefficient entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Scoring scheme boat coefficient", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }
}
