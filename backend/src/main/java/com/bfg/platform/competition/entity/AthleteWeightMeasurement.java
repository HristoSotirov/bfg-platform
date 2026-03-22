package com.bfg.platform.competition.entity;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.gen.model.WeightMeasurementRole;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "athlete_weight_measurements")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class AthleteWeightMeasurement {

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

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

    @Column(name = "measurement_date")
    private LocalDate measurementDate;

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private WeightMeasurementRole role;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
