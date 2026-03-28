package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.QualificationStage;
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
public interface QualificationStageRepository extends JpaRepository<QualificationStage, UUID>, JpaSpecificationExecutor<QualificationStage> {

    @Override
    @NonNull
    Page<QualificationStage> findAll(@NonNull Specification<QualificationStage> spec, @NonNull Pageable pageable);

    List<QualificationStage> findByQualificationSchemeIdOrderByStageRankAsc(UUID qualificationSchemeId);
}
