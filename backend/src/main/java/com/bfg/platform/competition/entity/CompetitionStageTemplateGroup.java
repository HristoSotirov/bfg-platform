package com.bfg.platform.competition.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "competition_stage_template_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CompetitionStageTemplateGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "stage_template_id")
    private UUID stageTemplateId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_template_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionStageTemplate stageTemplate;

    @Column(name = "competition_group_id")
    private UUID competitionGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_group_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CompetitionGroupDefinition competitionGroup;
}
