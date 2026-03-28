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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qualification_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class QualificationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "qualification_scheme_id")
    private UUID qualificationSchemeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qualification_scheme_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QualificationScheme qualificationScheme;

    @Column(name = "source_stage_id")
    private UUID sourceStageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_stage_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QualificationStage sourceStage;

    @Column(name = "destination_stage_id")
    private UUID destinationStageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_stage_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QualificationStage destinationStage;

    @Column(name = "qualify_by_position")
    private Integer qualifyByPosition;

    @Column(name = "base_qualify_by_time")
    private Integer baseQualifyByTime;

    @Column(name = "max_qualify_by_time")
    private Integer maxQualifyByTime;

    @Column(name = "is_remainder")
    private boolean isRemainder;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
