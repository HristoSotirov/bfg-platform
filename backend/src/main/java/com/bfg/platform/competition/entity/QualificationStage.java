package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.QualificationEventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qualification_stages")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class QualificationStage {

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

    @Column(name = "competition_event_type")
    @Enumerated(EnumType.STRING)
    private QualificationEventType competitionEventType;

    @Column(name = "boat_count_min")
    private Integer boatCountMin;

    @Column(name = "boat_count_max")
    private Integer boatCountMax;

    @Column(name = "event_count")
    private Integer eventCount;

    @Column(name = "stage_order")
    private Integer stageOrder;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
