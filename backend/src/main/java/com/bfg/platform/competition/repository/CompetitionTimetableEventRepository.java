package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.gen.model.QualificationEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface CompetitionTimetableEventRepository extends JpaRepository<CompetitionTimetableEvent, UUID>, JpaSpecificationExecutor<CompetitionTimetableEvent> {

    List<CompetitionTimetableEvent> findByCompetitionId(UUID competitionId);

    void deleteByCompetitionId(UUID competitionId);

    @Query("SELECT DISTINCT e.disciplineId FROM CompetitionTimetableEvent e WHERE e.competitionId = :competitionId")
    Set<UUID> findDistinctDisciplineIdsByCompetitionId(UUID competitionId);

    long countByCompetitionIdAndDisciplineId(UUID competitionId, UUID disciplineId);

    List<CompetitionTimetableEvent> findByCompetitionIdAndDisciplineIdOrderByScheduledAtAsc(
            UUID competitionId, UUID disciplineId);

    List<CompetitionTimetableEvent> findByCompetitionIdAndDisciplineIdAndQualificationEventType(
            UUID competitionId, UUID disciplineId, QualificationEventType qualificationEventType);
}
