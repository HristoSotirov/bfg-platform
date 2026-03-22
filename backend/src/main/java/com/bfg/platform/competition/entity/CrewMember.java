package com.bfg.platform.competition.entity;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.gen.model.SeatPosition;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "crew_members")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CrewMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "entry_id")
    private UUID entryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Entry entry;

    @Column(name = "seat_position")
    @Enumerated(EnumType.STRING)
    private SeatPosition seatPosition;

    @Column(name = "athlete_id")
    private UUID athleteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "athlete_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Athlete athlete;

    @Column(name = "card_number")
    private String cardNumber;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
