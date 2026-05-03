package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.gen.model.DisciplineGender;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface DisciplineDefinitionRepository extends JpaRepository<DisciplineDefinition, UUID>, JpaSpecificationExecutor<DisciplineDefinition> {

    @Override
    @NonNull
    Page<DisciplineDefinition> findAll(@NonNull Specification<DisciplineDefinition> spec, @NonNull Pageable pageable);

    boolean existsByCompetitionGroupIdAndMaxCrewFromTransferGreaterThan(UUID competitionGroupId, Integer maxCrewFromTransfer);

    boolean existsByCompetitionGroupIdAndHasCoxswain(UUID competitionGroupId, boolean hasCoxswain);

    boolean existsByCompetitionGroupIdAndIsLightweight(UUID competitionGroupId, boolean isLightweight);

    boolean existsByCompetitionGroupIdAndGenderInAndHasCoxswain(UUID competitionGroupId, Collection<DisciplineGender> genders, boolean hasCoxswain);

    boolean existsByCompetitionGroupIdAndGenderInAndIsLightweight(UUID competitionGroupId, Collection<DisciplineGender> genders, boolean isLightweight);
}
