package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.QualificationTier;
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
public interface QualificationTierRepository extends JpaRepository<QualificationTier, UUID>, JpaSpecificationExecutor<QualificationTier> {

    @Override
    @NonNull
    Page<QualificationTier> findAll(@NonNull Specification<QualificationTier> spec, @NonNull Pageable pageable);

    List<QualificationTier> findByQualificationSchemeIdOrderByBoatCountMinAsc(UUID qualificationSchemeId);
}
