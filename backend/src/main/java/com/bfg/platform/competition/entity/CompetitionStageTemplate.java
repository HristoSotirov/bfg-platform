package com.bfg.platform.competition.entity;

import com.bfg.platform.gen.model.CompetitionStageType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "competition_stage_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionStageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "template_id")
    private UUID templateId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionTemplate template;

    @Column(name = "stage_order")
    private Integer stageOrder;

    @Column(name = "name")
    private String name;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "competition_stage_type")
    @Enumerated(EnumType.STRING)
    private CompetitionStageType competitionStageType;

    @OneToMany(mappedBy = "stageTemplate", fetch = FetchType.LAZY, cascade = {})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<CompetitionStageTemplateGroup> groups;

    @OneToMany(mappedBy = "stageTemplate", fetch = FetchType.LAZY, cascade = {})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<CompetitionStageTemplateDiscipline> disciplines;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
