package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class DisciplineDefinitionMapper {

    private DisciplineDefinitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static DisciplineDefinitionDto toDto(DisciplineDefinition entity) {
        if (entity == null) return null;

        DisciplineDefinitionDto dto = new DisciplineDefinitionDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setShortName(entity.getShortName());
        dto.setCompetitionGroupId(entity.getCompetitionGroupId());
        dto.setBoatClass(entity.getBoatClass());
        dto.setCrewSize(entity.getCrewSize());
        dto.setHasCoxswain(entity.isHasCoxswain());
        dto.setIsLightweight(entity.isLightweight());
        dto.setDistanceMeters(entity.getDistanceMeters());
        dto.setMaxCrewFromTransfer(entity.getMaxCrewFromTransfer());
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static DisciplineDefinition fromCreateRequest(DisciplineDefinitionRequest request) {
        DisciplineDefinition entity = new DisciplineDefinition();
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setCompetitionGroupId(request.getCompetitionGroupId());
        entity.setBoatClass(request.getBoatClass());
        entity.setCrewSize(request.getCrewSize());
        entity.setHasCoxswain(request.getHasCoxswain() != null && request.getHasCoxswain());
        entity.setLightweight(request.getIsLightweight() != null && request.getIsLightweight());
        entity.setDistanceMeters(request.getDistanceMeters());
        entity.setMaxCrewFromTransfer(request.getMaxCrewFromTransfer());
        entity.setActive(request.getIsActive());
        return entity;
    }

    public static void updateFromRequest(DisciplineDefinition entity, DisciplineDefinitionRequest request) {
        entity.setName(request.getName());
        entity.setShortName(request.getShortName());
        entity.setCompetitionGroupId(request.getCompetitionGroupId());
        entity.setBoatClass(request.getBoatClass());
        entity.setCrewSize(request.getCrewSize());
        entity.setMaxCrewFromTransfer(request.getMaxCrewFromTransfer());
        entity.setHasCoxswain(request.getHasCoxswain() != null && request.getHasCoxswain());
        entity.setLightweight(request.getIsLightweight() != null && request.getIsLightweight());
        entity.setDistanceMeters(request.getDistanceMeters());
        entity.setActive(request.getIsActive());
    }
}
