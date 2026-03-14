package com.bfg.platform.athlete.entity;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.ScopeType;
import jakarta.persistence.*;
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
@Table(name = "accreditations")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Accreditation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "athlete_id")
    private UUID athleteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "athlete_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Athlete athlete;

    @Column(name = "club_id")
    private UUID clubId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Club club;

    @Column(name = "accreditation_number")
    private String accreditationNumber;

    @Column(name = "year")
    private Integer year;

    @Column(name = "scope_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ScopeType scopeType;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private AccreditationStatus status;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}

