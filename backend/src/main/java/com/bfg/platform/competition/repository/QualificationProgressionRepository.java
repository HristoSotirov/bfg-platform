package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.gen.model.QualificationEventType;
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
public interface QualificationProgressionRepository extends JpaRepository<QualificationProgression, UUID>, JpaSpecificationExecutor<QualificationProgression> {

    @Override
    @NonNull
    Page<QualificationProgression> findAll(@NonNull Specification<QualificationProgression> spec, @NonNull Pageable pageable);

    List<QualificationProgression> findByQualificationTierIdOrderByCreatedAtAsc(UUID qualificationTierId);

    List<QualificationProgression> findByQualificationTierIdAndSourceEvent(UUID qualificationTierId, QualificationEventType sourceEvent);

    void deleteByQualificationTierId(UUID qualificationTierId);
}
