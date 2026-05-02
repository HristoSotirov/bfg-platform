package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionParticipation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompetitionParticipationRepository extends JpaRepository<CompetitionParticipation, UUID> {

    List<CompetitionParticipation> findByCompetitionEventId(UUID competitionEventId);

    List<CompetitionParticipation> findByCompetitionEventIdOrderByLaneAsc(UUID competitionEventId);

    @Query("SELECT p FROM CompetitionParticipation p WHERE p.competitionEvent.competitionId = :competitionId")
    List<CompetitionParticipation> findByCompetitionId(UUID competitionId);

    @Query("SELECT p FROM CompetitionParticipation p WHERE p.competitionEvent.competitionId = :competitionId AND p.competitionEvent.disciplineId = :disciplineId")
    List<CompetitionParticipation> findByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM CompetitionParticipation p WHERE p.competitionEvent.competitionId = :competitionId")
    boolean existsByCompetitionEventCompetitionId(UUID competitionId);

    @Modifying
    @Query("DELETE FROM CompetitionParticipation p WHERE p.competitionEvent.competitionId = :competitionId AND p.finishTimeMs IS NULL")
    void deleteUnracedByCompetitionId(UUID competitionId);

    void deleteByCompetitionEventId(UUID competitionEventId);

    void deleteByEntryId(UUID entryId);

    boolean existsByEntryIdAndFinishTimeMsIsNotNull(UUID entryId);

    List<CompetitionParticipation> findByEntryId(UUID entryId);
}
