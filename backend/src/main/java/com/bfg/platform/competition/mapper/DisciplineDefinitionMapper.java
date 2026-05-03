package com.bfg.platform.competition.mapper;

import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

public class DisciplineDefinitionMapper {

    public record BoatClassFields(int crewSize, boolean hasCoxswain) {}

    private DisciplineDefinitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static DisciplineDefinitionDto toDto(DisciplineDefinition entity) {
        return toDto(entity, null);
    }

    public static DisciplineDefinitionDto toDto(DisciplineDefinition entity, Set<String> expand) {
        if (entity == null) return null;

        DisciplineDefinitionDto dto = new DisciplineDefinitionDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setShortName(entity.getShortName());
        dto.setGender(entity.getGender());
        dto.setCompetitionGroupId(entity.getCompetitionGroupId());
        dto.setBoatClass(entity.getBoatClass());
        dto.setCrewSize(entity.getCrewSize());
        dto.setHasCoxswain(entity.isHasCoxswain());
        dto.setIsLightweight(entity.isLightweight());
        dto.setDistanceMeters(entity.getDistanceMeters());
        dto.setMaxCrewFromTransfer(entity.getMaxCrewFromTransfer());
        dto.setIsActive(entity.isActive());
        dto.setMaxBoatsPerClub(entity.getMaxBoatsPerClub());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        if (expand != null && expand.contains("competitionGroup") && entity.getCompetitionGroup() != null) {
            Set<String> groupExpand = ExpandQueryParser.subExpand(expand, "competitionGroup");
            dto.setCompetitionGroup(CompetitionGroupDefinitionMapper.toDto(entity.getCompetitionGroup(), groupExpand));
        }

        return dto;
    }

    public static DisciplineDefinition fromCreateRequest(DisciplineDefinitionRequest request, BoatClassFields boatClassFields) {
        DisciplineDefinition entity = new DisciplineDefinition();
        entity.setName(request.getName().trim());
        entity.setShortName(request.getShortName().trim());
        entity.setCompetitionGroupId(request.getCompetitionGroupId());
        entity.setGender(request.getGender());
        entity.setBoatClass(request.getBoatClass());
        entity.setCrewSize(boatClassFields.crewSize());
        entity.setHasCoxswain(boatClassFields.hasCoxswain());
        entity.setLightweight(request.getIsLightweight());
        entity.setDistanceMeters(request.getDistanceMeters());
        entity.setMaxCrewFromTransfer(request.getMaxCrewFromTransfer());
        entity.setActive(request.getIsActive());
        entity.setMaxBoatsPerClub(request.getMaxBoatsPerClub());
        return entity;
    }

    public static void updateFromRequest(DisciplineDefinition entity, DisciplineDefinitionRequest request, BoatClassFields boatClassFields) {
        entity.setName(request.getName().trim());
        entity.setShortName(request.getShortName().trim());
        entity.setCompetitionGroupId(request.getCompetitionGroupId());
        entity.setGender(request.getGender());
        entity.setBoatClass(request.getBoatClass());
        entity.setCrewSize(boatClassFields.crewSize());
        entity.setMaxCrewFromTransfer(request.getMaxCrewFromTransfer());
        entity.setHasCoxswain(boatClassFields.hasCoxswain());
        entity.setLightweight(request.getIsLightweight());
        entity.setDistanceMeters(request.getDistanceMeters());
        entity.setActive(request.getIsActive());
        entity.setMaxBoatsPerClub(request.getMaxBoatsPerClub());
    }
}
