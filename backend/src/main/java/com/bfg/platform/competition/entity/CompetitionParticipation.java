package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.FinishStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "competition_participations")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionParticipation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "competition_event_id")
    private UUID competitionEventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_event_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionEventTimetable competitionEvent;

    @Column(name = "entry_id")
    private UUID entryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Entry entry;

    @Column(name = "lane")
    private Integer lane;

    @Column(name = "finish_status")
    @Enumerated(EnumType.STRING)
    private FinishStatus finishStatus;

    @Column(name = "finish_time_ms")
    private Integer finishTimeMs;

    @Column(name = "place")
    private Integer place;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
