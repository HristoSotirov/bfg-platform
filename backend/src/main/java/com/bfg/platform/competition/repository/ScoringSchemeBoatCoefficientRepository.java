package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ScoringSchemeBoatCoefficientRepository extends JpaRepository<ScoringSchemeBoatCoefficient, UUID>, JpaSpecificationExecutor<ScoringSchemeBoatCoefficient> {

    @Override
    @NonNull
    Page<ScoringSchemeBoatCoefficient> findAll(@NonNull Specification<ScoringSchemeBoatCoefficient> spec, @NonNull Pageable pageable);
}
