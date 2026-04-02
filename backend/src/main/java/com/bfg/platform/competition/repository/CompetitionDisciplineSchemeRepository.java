package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Set;
import java.util.UUID;

@Repository
public interface CompetitionDisciplineSchemeRepository extends JpaRepository<CompetitionDisciplineScheme, UUID>, JpaSpecificationExecutor<CompetitionDisciplineScheme> {

    @Query("SELECT s.disciplineId FROM CompetitionDisciplineScheme s WHERE s.competitionId = :competitionId")
    Set<UUID> findDisciplineIdsByCompetitionId(UUID competitionId);

    boolean existsByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    long countByCompetitionId(UUID competitionId);
}
