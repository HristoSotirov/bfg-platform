package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionDto;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionGroupDefinitionMapper {

    private CompetitionGroupDefinitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionGroupDefinitionDto toDto(CompetitionGroupDefinition entity) {
        if (entity == null) return null;

        CompetitionGroupDefinitionDto dto = new CompetitionGroupDefinitionDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setShortName(entity.getShortName());
        dto.setGender(entity.getGender());
        dto.setMinAge(entity.getMinAge());
        dto.setMaxAge(entity.getMaxAge());
        dto.setMaxDisciplinesPerAthlete(entity.getMaxDisciplinesPerAthlete());
        dto.setTransferFromGroupId(entity.getTransferFromGroupId());
        dto.setMinCrewForTransfer(entity.getMinCrewForTransfer());
        dto.setTransferRatio(entity.getTransferRatio());
        dto.setTransferRounding(entity.getTransferRounding());
        dto.setTransferredMaxDisciplinesPerPerson(entity.getTransferredMaxDisciplinesPerPerson());
        dto.setCoxRequiredWeightKg(entity.getCoxRequiredWeightKg() != null ? entity.getCoxRequiredWeightKg().doubleValue() : null);
        dto.setCoxMinWeightKg(entity.getCoxMinWeightKg() != null ? entity.getCoxMinWeightKg().doubleValue() : null);
        dto.setLightMaxWeightKg(entity.getLightMaxWeightKg() != null ? entity.getLightMaxWeightKg().doubleValue() : null);
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionGroupDefinition fromCreateRequest(CompetitionGroupDefinitionRequest request) {
        CompetitionGroupDefinition entity = new CompetitionGroupDefinition();
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setGender(request.getGender());
        entity.setMinAge(request.getMinAge());
        entity.setMaxAge(request.getMaxAge());
        entity.setMaxDisciplinesPerAthlete(request.getMaxDisciplinesPerAthlete());
        entity.setTransferFromGroupId(request.getTransferFromGroupId());
        entity.setMinCrewForTransfer(request.getMinCrewForTransfer());
        entity.setTransferRatio(request.getTransferRatio());
        entity.setTransferRounding(request.getTransferRounding());
        entity.setTransferredMaxDisciplinesPerPerson(request.getTransferredMaxDisciplinesPerPerson());
        entity.setCoxRequiredWeightKg(request.getCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getCoxRequiredWeightKg()) : null);
        entity.setCoxMinWeightKg(request.getCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getCoxMinWeightKg()) : null);
        entity.setLightMaxWeightKg(request.getLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getLightMaxWeightKg()) : null);
        entity.setActive(request.getIsActive());
        return entity;
    }

    public static void updateFromRequest(CompetitionGroupDefinition entity, CompetitionGroupDefinitionRequest request) {
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setGender(request.getGender());
        entity.setMinAge(request.getMinAge());
        entity.setMaxAge(request.getMaxAge());
        entity.setMaxDisciplinesPerAthlete(request.getMaxDisciplinesPerAthlete());
        entity.setTransferFromGroupId(request.getTransferFromGroupId());
        entity.setMinCrewForTransfer(request.getMinCrewForTransfer());
        entity.setTransferRatio(request.getTransferRatio());
        entity.setTransferRounding(request.getTransferRounding());
        entity.setTransferredMaxDisciplinesPerPerson(request.getTransferredMaxDisciplinesPerPerson());
        entity.setCoxRequiredWeightKg(request.getCoxRequiredWeightKg() != null ? BigDecimal.valueOf(request.getCoxRequiredWeightKg()) : null);
        entity.setCoxMinWeightKg(request.getCoxMinWeightKg() != null ? BigDecimal.valueOf(request.getCoxMinWeightKg()) : null);
        entity.setLightMaxWeightKg(request.getLightMaxWeightKg() != null ? BigDecimal.valueOf(request.getLightMaxWeightKg()) : null);
        entity.setActive(request.getIsActive());
    }
}
