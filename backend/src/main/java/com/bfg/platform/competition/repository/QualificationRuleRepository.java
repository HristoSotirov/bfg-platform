package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.QualificationRule;
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
public interface QualificationRuleRepository extends JpaRepository<QualificationRule, UUID>, JpaSpecificationExecutor<QualificationRule> {

    @Override
    @NonNull
    Page<QualificationRule> findAll(@NonNull Specification<QualificationRule> spec, @NonNull Pageable pageable);

    boolean existsByQualificationSchemeIdAndSourceStageIdAndDestinationStageId(UUID schemeId, UUID sourceStageId, UUID destinationStageId);

    boolean existsByQualificationSchemeIdAndSourceStageIdAndDestinationStageIdAndIdNot(UUID schemeId, UUID sourceStageId, UUID destinationStageId, UUID id);

    boolean existsBySourceStageIdOrDestinationStageId(UUID sourceStageId, UUID destinationStageId);
}
