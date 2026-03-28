package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CompetitionTemplateRepository extends JpaRepository<CompetitionTemplate, UUID>, JpaSpecificationExecutor<CompetitionTemplate> {

    @Override
    @NonNull
    Page<CompetitionTemplate> findAll(@NonNull Specification<CompetitionTemplate> spec, @NonNull Pageable pageable);
}
