package com.bfg.platform.competition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "competition_final_standings")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionFinalStanding {

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

    @Column(name = "stage_id")
    private UUID stageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionStage stage;

    @Column(name = "discipline_id")
    private UUID disciplineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DisciplineDefinition discipline;

    @Column(name = "entry_id")
    private UUID entryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Entry entry;

    @Column(name = "overall_rank")
    private Integer overallRank;

    @Column(name = "best_time_ms")
    private Integer bestTimeMs;

    @Column(name = "points")
    private BigDecimal points;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
