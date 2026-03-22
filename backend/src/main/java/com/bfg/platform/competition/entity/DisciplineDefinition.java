package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.CompetitionGroupGender;
import com.bfg.platform.gen.model.CompetitionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "discipline_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class DisciplineDefinition {

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

    @Column(name = "boat_class")
    private String boatClass;

    @Column(name = "crew_size")
    private Integer crewSize;

    @Column(name = "has_coxswain")
    private boolean hasCoxswain;

    @Column(name = "is_lightweight")
    private boolean isLightweight;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(name = "competition_group_id")
    private UUID competitionGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_group_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionGroupDefinition competitionGroup;

    @Column(name = "max_transfer_crew")
    private Integer maxTransferCrew;

    @Column(name = "scoring_multiplier")
    private BigDecimal scoringMultiplier;

    @Column(name = "competition_type")
    @Enumerated(EnumType.STRING)
    private CompetitionType competitionType;

    @Column(name = "is_active")
    private boolean isActive;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
