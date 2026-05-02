package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EntryRepository extends JpaRepository<Entry, UUID>, JpaSpecificationExecutor<Entry> {

    List<Entry> findByCompetitionIdAndClubId(UUID competitionId, UUID clubId);

    List<Entry> findByCompetitionId(UUID competitionId);

    List<Entry> findByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    long countByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    void deleteByCompetitionIdAndClubId(UUID competitionId, UUID clubId);
}
