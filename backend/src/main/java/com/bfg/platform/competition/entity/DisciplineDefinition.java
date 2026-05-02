package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.BoatClass;
import com.bfg.platform.gen.model.DisciplineGender;
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

    @Column(name = "name")
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "competition_group_id")
    private UUID competitionGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_group_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionGroupDefinition competitionGroup;

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    private DisciplineGender gender;

    @Column(name = "boat_class")
    @Enumerated(EnumType.STRING)
    private BoatClass boatClass;

    @Column(name = "crew_size")
    private Integer crewSize;

    @Column(name = "max_crew_from_transfer")
    private int maxCrewFromTransfer;

    @Column(name = "has_coxswain")
    private boolean hasCoxswain;

    @Column(name = "is_lightweight")
    private boolean isLightweight;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(name = "is_active")
    private boolean isActive;

    @Column(name = "max_boats_per_club")
    private int maxBoatsPerClub;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
