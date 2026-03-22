package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.QualificationEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "competition_events_timetable_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionEventTimetableTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "competition_template_id")
    private UUID competitionTemplateId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_template_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionTemplate template;

    @Column(name = "stage_template_id")
    private UUID stageTemplateId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_template_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionStageTemplate stageTemplate;

    @Column(name = "discipline_code")
    private String disciplineCode;

    @Column(name = "qualification_event_type")
    @Enumerated(EnumType.STRING)
    private QualificationEventType qualificationEventType;

    @Column(name = "day_offset")
    private Integer dayOffset;

    @Column(name = "planned_time")
    private LocalTime plannedTime;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
