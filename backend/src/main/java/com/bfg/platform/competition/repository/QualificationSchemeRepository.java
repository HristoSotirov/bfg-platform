package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.QualificationScheme;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QualificationSchemeRepository extends JpaRepository<QualificationScheme, UUID>, JpaSpecificationExecutor<QualificationScheme> {

    @Override
    @NonNull
    Page<QualificationScheme> findAll(@NonNull Specification<QualificationScheme> spec, @NonNull Pageable pageable);
}
