package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionFinalStanding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompetitionFinalStandingRepository extends JpaRepository<CompetitionFinalStanding, UUID> {

    boolean existsByEntryId(UUID entryId);

    List<CompetitionFinalStanding> findByCompetitionId(UUID competitionId);

    List<CompetitionFinalStanding> findByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    List<CompetitionFinalStanding> findByCompetitionIdAndDisciplineIdIn(UUID competitionId, List<UUID> disciplineIds);

    List<CompetitionFinalStanding> findByCompetitionIdIn(List<UUID> competitionIds);

    @Transactional
    void deleteByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    @Transactional
    void deleteByCompetitionIdAndDisciplineIdIn(UUID competitionId, List<UUID> disciplineIds);
}
