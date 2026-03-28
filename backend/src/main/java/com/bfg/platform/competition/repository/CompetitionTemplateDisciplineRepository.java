package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionTemplateDiscipline;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CompetitionTemplateDisciplineRepository extends JpaRepository<CompetitionTemplateDiscipline, UUID>, JpaSpecificationExecutor<CompetitionTemplateDiscipline> {

    @Override
    @NonNull
    Page<CompetitionTemplateDiscipline> findAll(@NonNull Specification<CompetitionTemplateDiscipline> spec, @NonNull Pageable pageable);
}
