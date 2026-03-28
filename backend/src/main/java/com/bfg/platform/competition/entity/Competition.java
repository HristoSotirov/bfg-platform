package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.CompetitionStatus;
import com.bfg.platform.gen.model.ScopeType;
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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "competitions")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Competition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "name")
    private String name;

    @Column(name = "season")
    private Integer season;

    @Column(name = "location")
    private String location;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private CompetitionStatus status;

    @Column(name = "scope_type")
    @Enumerated(EnumType.STRING)
    private ScopeType scopeType;

    @Column(name = "qualification_scheme_id")
    private UUID qualificationSchemeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qualification_scheme_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QualificationScheme qualificationScheme;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
