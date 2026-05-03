package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.ScoringScheme;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ScoringSchemeRepository extends JpaRepository<ScoringScheme, UUID>, JpaSpecificationExecutor<ScoringScheme> {

    @Override
    @NonNull
    Page<ScoringScheme> findAll(@NonNull Specification<ScoringScheme> spec, @NonNull Pageable pageable);
}
