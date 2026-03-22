package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.StageStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "competition_stages")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "competition_id")
    private UUID competitionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Competition competition;

    @Column(name = "stage_order")
    private Integer stageOrder;

    @Column(name = "name")
    private String name;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "submission_start")
    private Instant submissionStart;

    @Column(name = "submission_end")
    private Instant submissionEnd;

    @Column(name = "tech_meeting_at")
    private Instant techMeetingAt;

    @Column(name = "changes_deadline_hours")
    private Integer changesDeadlineHours;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private StageStatus status;

    @OneToMany(mappedBy = "stage", fetch = FetchType.LAZY, cascade = {})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<CompetitionStageGroup> groups;

    @OneToMany(mappedBy = "stage", fetch = FetchType.LAZY, cascade = {})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<CompetitionStageDiscipline> disciplines;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
