package com.bfg.platform.competition.mapper;

import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionDto;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

public class CompetitionGroupDefinitionMapper {

    private CompetitionGroupDefinitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionGroupDefinitionDto toDto(CompetitionGroupDefinition entity) {
        return toDto(entity, null);
    }

    public static CompetitionGroupDefinitionDto toDto(CompetitionGroupDefinition entity, Set<String> expand) {
        if (entity == null) return null;

        CompetitionGroupDefinitionDto dto = new CompetitionGroupDefinitionDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setShortName(entity.getShortName());
        dto.setMinAge(entity.getMinAge());
        dto.setMaxAge(entity.getMaxAge());
        dto.setCoxMinAge(entity.getCoxMinAge());
        dto.setCoxMaxAge(entity.getCoxMaxAge());
        dto.setMaxDisciplinesPerAthlete(entity.getMaxDisciplinesPerAthlete());
        dto.setTransferFromGroupId(entity.getTransferFromGroupId());
        dto.setMinCrewForTransfer(entity.getMinCrewForTransfer());
        dto.setTransferRatio(entity.getTransferRatio());
        dto.setTransferRounding(entity.getTransferRounding());
        dto.setTransferredMaxDisciplinesPerAthlete(entity.getTransferredMaxDisciplinesPerAthlete());
        dto.setMaleTeamCoxRequiredWeightKg(entity.getMaleTeamCoxRequiredWeightKg() != null ? entity.getMaleTeamCoxRequiredWeightKg().doubleValue() : null);
        dto.setMaleTeamCoxMinWeightKg(entity.getMaleTeamCoxMinWeightKg() != null ? entity.getMaleTeamCoxMinWeightKg().doubleValue() : null);
        dto.setMaleTeamLightMaxWeightKg(entity.getMaleTeamLightMaxWeightKg() != null ? entity.getMaleTeamLightMaxWeightKg().doubleValue() : null);
        dto.setFemaleTeamCoxRequiredWeightKg(entity.getFemaleTeamCoxRequiredWeightKg() != null ? entity.getFemaleTeamCoxRequiredWeightKg().doubleValue() : null);
        dto.setFemaleTeamCoxMinWeightKg(entity.getFemaleTeamCoxMinWeightKg() != null ? entity.getFemaleTeamCoxMinWeightKg().doubleValue() : null);
        dto.setFemaleTeamLightMaxWeightKg(entity.getFemaleTeamLightMaxWeightKg() != null ? entity.getFemaleTeamLightMaxWeightKg().doubleValue() : null);
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        if (expand != null && expand.contains("transferFromGroup") && entity.getTransferFromGroup() != null) {
            Set<String> childExpand = ExpandQueryParser.subExpand(expand, "transferFromGroup");
            dto.setTransferFromGroup(toDto(entity.getTransferFromGroup(), childExpand));
        }

        return dto;
    }

    public static CompetitionGroupDefinition fromCreateRequest(CompetitionGroupDefinitionRequest request) {
        CompetitionGroupDefinition entity = new CompetitionGroupDefinition();
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setMinAge(request.getMinAge());
        entity.setMaxAge(request.getMaxAge());
        entity.setCoxMinAge(request.getCoxMinAge());
        entity.setCoxMaxAge(request.getCoxMaxAge());
        entity.setMaxDisciplinesPerAthlete(request.getMaxDisciplinesPerAthlete());
        entity.setTransferFromGroupId(request.getTransferFromGroupId());
        entity.setMinCrewForTransfer(request.getMinCrewForTransfer());
        entity.setTransferRatio(request.getTransferRatio());
        entity.setTransferRounding(request.getTransferRounding());
        entity.setTransferredMaxDisciplinesPerAthlete(request.getTransferredMaxDisciplinesPerAthlete());
        entity.setMaleTeamCoxRequiredWeightKg(request.getMaleTeamCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamCoxRequiredWeightKg()) : null);
        entity.setMaleTeamCoxMinWeightKg(request.getMaleTeamCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamCoxMinWeightKg()) : null);
        entity.setMaleTeamLightMaxWeightKg(request.getMaleTeamLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamLightMaxWeightKg()) : null);
        entity.setFemaleTeamCoxRequiredWeightKg(request.getFemaleTeamCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamCoxRequiredWeightKg()) : null);
        entity.setFemaleTeamCoxMinWeightKg(request.getFemaleTeamCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamCoxMinWeightKg()) : null);
        entity.setFemaleTeamLightMaxWeightKg(request.getFemaleTeamLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamLightMaxWeightKg()) : null);
        entity.setActive(request.getIsActive());
        return entity;
    }

    public static void updateFromRequest(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setMinAge(request.getMinAge());
        entity.setMaxAge(request.getMaxAge());
        entity.setCoxMinAge(request.getCoxMinAge());
        entity.setCoxMaxAge(request.getCoxMaxAge());
        entity.setMaxDisciplinesPerAthlete(request.getMaxDisciplinesPerAthlete());
        entity.setTransferFromGroupId(request.getTransferFromGroupId());
        entity.setMinCrewForTransfer(request.getMinCrewForTransfer());
        entity.setTransferRatio(request.getTransferRatio());
        entity.setTransferRounding(request.getTransferRounding());
        entity.setTransferredMaxDisciplinesPerAthlete(request.getTransferredMaxDisciplinesPerAthlete());
        entity.setMaleTeamCoxRequiredWeightKg(request.getMaleTeamCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamCoxRequiredWeightKg()) : null);
        entity.setMaleTeamCoxMinWeightKg(request.getMaleTeamCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamCoxMinWeightKg()) : null);
        entity.setMaleTeamLightMaxWeightKg(request.getMaleTeamLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getMaleTeamLightMaxWeightKg()) : null);
        entity.setFemaleTeamCoxRequiredWeightKg(request.getFemaleTeamCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamCoxRequiredWeightKg()) : null);
        entity.setFemaleTeamCoxMinWeightKg(request.getFemaleTeamCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamCoxMinWeightKg()) : null);
        entity.setFemaleTeamLightMaxWeightKg(request.getFemaleTeamLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getFemaleTeamLightMaxWeightKg()) : null);
        entity.setActive(request.getIsActive());
    }
}
