package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.CompetitionGroupGender;
import com.bfg.platform.gen.model.CompetitionType;
import com.bfg.platform.gen.model.TransferRounding;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "competition_group_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionGroupDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "code")
    private String code;

    @Column(name = "name")
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    private CompetitionGroupGender gender;

    @Column(name = "min_age")
    private Integer minAge;

    @Column(name = "max_age")
    private Integer maxAge;

    @Column(name = "competition_type")
    @Enumerated(EnumType.STRING)
    private CompetitionType competitionType;

    @Column(name = "transfer_group_id")
    private UUID transferGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_group_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionGroupDefinition transferGroup;

    @Column(name = "transfer_min_crew")
    private Integer transferMinCrew;

    @Column(name = "transfer_ratio")
    private Integer transferRatio;

    @Column(name = "transfer_rounding")
    @Enumerated(EnumType.STRING)
    private TransferRounding transferRounding;

    @Column(name = "cox_required_weight_kg")
    private BigDecimal coxRequiredWeightKg;

    @Column(name = "cox_min_weight_kg")
    private BigDecimal coxMinWeightKg;

    @Column(name = "light_max_weight_kg")
    private BigDecimal lightMaxWeightKg;

    @Column(name = "is_active")
    private boolean isActive;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
