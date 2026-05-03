package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.ScoringRule;
import com.bfg.platform.competition.mapper.ScoringRuleMapper;
import com.bfg.platform.competition.query.ScoringRuleQueryAdapter;
import com.bfg.platform.competition.repository.ScoringRuleRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.ScoringRuleDto;
import com.bfg.platform.gen.model.ScoringRuleRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ScoringRuleServiceImpl implements ScoringRuleService {

    private final ScoringRuleRepository repository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<ScoringRuleDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<ScoringRule> filterResult =
                ScoringRuleQueryAdapter.parseFilter(filter, null);
        Specification<ScoringRule> filterSpec = filterResult.getSpecification();
        Specification<ScoringRule> searchSpec = ScoringRuleQueryAdapter.parseSearch(search);
        Specification<ScoringRule> spec = Specification.where(filterSpec).and(searchSpec);

        EnhancedSortParser.ParseResult sortResult = ScoringRuleQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(ScoringRuleMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ScoringRuleDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(ScoringRuleMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<ScoringRuleDto> create(ScoringRuleRequest request) {
        List<ScoringRule> existing = repository.findByScoringSchemeIdOrderByPlacementAsc(request.getScoringSchemeId());
        validateCreateConsistency(existing, request.getPlacement(), BigDecimal.valueOf(request.getBasePoints()));

        ScoringRule entity = ScoringRuleMapper.fromRequest(request);
        ScoringRule saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(ScoringRuleMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<ScoringRuleDto> update(UUID uuid, ScoringRuleRequest request) {
        return repository.findById(uuid)
                .map(entity -> {
                    List<ScoringRule> existing = repository.findByScoringSchemeIdOrderByPlacementAsc(entity.getScoringSchemeId());
                    validateUpdateConsistency(existing, entity.getId(), request.getPlacement(), BigDecimal.valueOf(request.getBasePoints()));

                    ScoringRuleMapper.updateFromRequest(entity, request);
                    ScoringRule saved = repository.save(entity);
                    entityManager.flush();
                    return ScoringRuleMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        ScoringRule entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Scoring rule", uuid));

        List<ScoringRule> existing = repository.findByScoringSchemeIdOrderByPlacementAsc(entity.getScoringSchemeId());
        validateDeleteConsistency(existing, entity.getId(), entity.getPlacement());

        try {
            repository.delete(entity);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private void validateCreateConsistency(List<ScoringRule> existing, int newPlacement, BigDecimal newPoints) {
        // Build simulated list with the new rule
        List<PlacementPoints> simulated = new ArrayList<>();
        for (ScoringRule rule : existing) {
            simulated.add(new PlacementPoints(rule.getPlacement(), rule.getBasePoints()));
        }
        simulated.add(new PlacementPoints(newPlacement, newPoints));
        simulated.sort(Comparator.comparingInt(PlacementPoints::placement));

        validatePlacementsAndPoints(simulated);
    }

    private void validateUpdateConsistency(List<ScoringRule> existing, UUID updatedId, int newPlacement, BigDecimal newPoints) {
        // Build simulated list replacing the updated rule
        List<PlacementPoints> simulated = new ArrayList<>();
        for (ScoringRule rule : existing) {
            if (rule.getId().equals(updatedId)) {
                simulated.add(new PlacementPoints(newPlacement, newPoints));
            } else {
                simulated.add(new PlacementPoints(rule.getPlacement(), rule.getBasePoints()));
            }
        }
        simulated.sort(Comparator.comparingInt(PlacementPoints::placement));

        validatePlacementsAndPoints(simulated);
    }

    private void validateDeleteConsistency(List<ScoringRule> existing, UUID deletedId, int deletedPlacement) {
        // Build simulated list without the deleted rule
        List<PlacementPoints> simulated = new ArrayList<>();
        for (ScoringRule rule : existing) {
            if (!rule.getId().equals(deletedId)) {
                simulated.add(new PlacementPoints(rule.getPlacement(), rule.getBasePoints()));
            }
        }

        if (simulated.isEmpty()) {
            return;
        }

        simulated.sort(Comparator.comparingInt(PlacementPoints::placement));

        // Check for gaps after removal
        for (int i = 0; i < simulated.size(); i++) {
            int expected = i + 1;
            if (simulated.get(i).placement() != expected) {
                throw new ValidationException(
                        "Cannot delete placement " + deletedPlacement +
                        ": it would create a gap. Delete from the last placement first.");
            }
        }
    }

    private void validatePlacementsAndPoints(List<PlacementPoints> rules) {
        // Check sequential placements starting from 1
        for (int i = 0; i < rules.size(); i++) {
            int expected = i + 1;
            int actual = rules.get(i).placement();
            if (actual != expected) {
                throw new ValidationException(
                        "Placement gap: expected " + expected + " but found " + actual +
                        ". Placements must be sequential starting from 1.");
            }
        }

        // Check points are strictly descending
        for (int i = 1; i < rules.size(); i++) {
            BigDecimal prevPoints = rules.get(i - 1).points();
            BigDecimal currPoints = rules.get(i).points();

            if (currPoints.compareTo(prevPoints) >= 0) {
                throw new ValidationException(
                        "Points inconsistency: placement " + rules.get(i - 1).placement() +
                        " has " + prevPoints + " points but placement " + rules.get(i).placement() +
                        " has " + currPoints + " points. Higher placement must have more points.");
            }
        }
    }

    private record PlacementPoints(int placement, BigDecimal points) {}
}
