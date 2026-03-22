package com.bfg.platform.competition.entity;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "code")
    private String code;

    @Column(name = "scheme_id")
    private UUID schemeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QualificationScheme scheme;

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

    @Column(name = "qualify_by_time")
    private Integer qualifyByTime;

    @Column(name = "is_remainder")
    private boolean isRemainder;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
