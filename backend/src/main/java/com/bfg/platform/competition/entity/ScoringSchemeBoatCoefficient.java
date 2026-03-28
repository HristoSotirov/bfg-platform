package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.BoatClass;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scoring_scheme_boat_coefficients")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ScoringSchemeBoatCoefficient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "scoring_scheme_id")
    private UUID scoringSchemeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scoring_scheme_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ScoringScheme scoringScheme;

    @Column(name = "boat_class", nullable = false)
    @Enumerated(EnumType.STRING)
    private BoatClass boatClass;

    @Column(name = "coefficient", nullable = false)
    private BigDecimal coefficient;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
