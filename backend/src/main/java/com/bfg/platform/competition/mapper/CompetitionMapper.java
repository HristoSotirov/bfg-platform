package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionRequest;
import com.bfg.platform.gen.model.CompetitionStatus;
import com.bfg.platform.gen.model.ScopeType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionMapper {

    private CompetitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionDto toDto(Competition entity) {
        if (entity == null) return null;

        CompetitionDto dto = new CompetitionDto();
        dto.setUuid(entity.getId());
        dto.setIsTemplate(entity.isTemplate());
        dto.setShortName(entity.getShortName());
        dto.setName(entity.getName());
        dto.setDurationDays(entity.getDurationDays());
        dto.setSeason(entity.getSeason());
        dto.setLocation(entity.getLocation());
        dto.setStartDate(entity.getStartDate());
        dto.setEndDate(entity.getEndDate());
        dto.setStatus(entity.getStatus() != null ? CompetitionStatus.fromValue(entity.getStatus()) : null);
        dto.setScopeType(entity.getScopeType() != null ? ScopeType.fromValue(entity.getScopeType()) : null);
        dto.setScoringSchemeId(entity.getScoringSchemeId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static Competition fromRequest(CompetitionRequest request) {
        Competition entity = new Competition();
        entity.setTemplate(request.getIsTemplate());
        entity.setShortName(request.getShortName());
        entity.setName(request.getName());
        entity.setDurationDays(request.getDurationDays());
        entity.setSeason(request.getSeason());
        entity.setLocation(request.getLocation());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setStatus(request.getStatus() != null ? request.getStatus().getValue() : null);
        entity.setScopeType(request.getScopeType() != null ? request.getScopeType().getValue() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        return entity;
    }

    public static void updateFromRequest(Competition entity, CompetitionRequest request) {
        entity.setTemplate(request.getIsTemplate());
        entity.setShortName(request.getShortName());
        entity.setName(request.getName());
        entity.setDurationDays(request.getDurationDays());
        entity.setSeason(request.getSeason());
        entity.setLocation(request.getLocation());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setStatus(request.getStatus() != null ? request.getStatus().getValue() : null);
        entity.setScopeType(request.getScopeType() != null ? request.getScopeType().getValue() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
    }
}
