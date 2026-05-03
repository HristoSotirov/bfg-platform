package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.TransferRounding;
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

    @Column(name = "name")
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "min_age")
    private Integer minAge;

    @Column(name = "max_age")
    private Integer maxAge;

    @Column(name = "cox_min_age")
    private Integer coxMinAge;

    @Column(name = "cox_max_age")
    private Integer coxMaxAge;

    @Column(name = "max_disciplines_per_athlete")
    private int maxDisciplinesPerAthlete;

    @Column(name = "transfer_from_group_id")
    private UUID transferFromGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_from_group_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionGroupDefinition transferFromGroup;

    @Column(name = "min_crew_for_transfer")
    private Integer minCrewForTransfer;

    @Column(name = "transfer_ratio")
    private Integer transferRatio;

    @Column(name = "transfer_rounding")
    @Enumerated(EnumType.STRING)
    private TransferRounding transferRounding;

    @Column(name = "transferred_max_disciplines_per_athlete")
    private Integer transferredMaxDisciplinesPerAthlete;

    @Column(name = "male_team_cox_required_weight_kg")
    private BigDecimal maleTeamCoxRequiredWeightKg;

    @Column(name = "male_team_cox_min_weight_kg")
    private BigDecimal maleTeamCoxMinWeightKg;

    @Column(name = "male_team_light_max_weight_kg")
    private BigDecimal maleTeamLightMaxWeightKg;

    @Column(name = "female_team_cox_required_weight_kg")
    private BigDecimal femaleTeamCoxRequiredWeightKg;

    @Column(name = "female_team_cox_min_weight_kg")
    private BigDecimal femaleTeamCoxMinWeightKg;

    @Column(name = "female_team_light_max_weight_kg")
    private BigDecimal femaleTeamLightMaxWeightKg;

    @Column(name = "is_active")
    private boolean isActive;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
