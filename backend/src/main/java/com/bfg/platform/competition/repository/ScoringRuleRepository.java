package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.ScoringRule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScoringRuleRepository extends JpaRepository<ScoringRule, UUID>, JpaSpecificationExecutor<ScoringRule> {

    @Override
    @NonNull
    Page<ScoringRule> findAll(@NonNull Specification<ScoringRule> spec, @NonNull Pageable pageable);

    List<ScoringRule> findByScoringSchemeIdOrderByPlacementAsc(UUID scoringSchemeId);
}
