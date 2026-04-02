package com.bfg.platform.competition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "competition_timetable_events")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionTimetableEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "competition_id", nullable = false)
    private UUID competitionId;

    @Column(name = "event_number", nullable = false)
    private Integer eventNumber;

    @Column(name = "discipline_id", nullable = false)
    private UUID disciplineId;

    @Column(name = "qualification_event_type", nullable = false)
    private String qualificationEventType;

    @Column(name = "qualification_stage_number", nullable = false)
    private Integer qualificationStageNumber;

    @Column(name = "day_offset", nullable = false)
    private Integer dayOffset;

    @Column(name = "planned_time", nullable = false)
    private LocalTime plannedTime;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "event_status")
    private String eventStatus;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
