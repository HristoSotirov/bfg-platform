package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionTemplate;
import com.bfg.platform.gen.model.CompetitionTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDto;
import com.bfg.platform.gen.model.CompetitionTemplateUpdateRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionTemplateMapper {

    private CompetitionTemplateMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionTemplateDto toDto(CompetitionTemplate entity) {
        if (entity == null) return null;

        CompetitionTemplateDto dto = new CompetitionTemplateDto();
        dto.setUuid(entity.getId());
        dto.setShortName(entity.getShortName());
        dto.setName(entity.getName());
        dto.setDurationDays(entity.getDurationDays());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionTemplate fromCreateRequest(CompetitionTemplateCreateRequest request) {
        CompetitionTemplate entity = new CompetitionTemplate();
        entity.setShortName(request.getShortName());
        entity.setName(request.getName());
        entity.setDurationDays(request.getDurationDays());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setActive(true);
        return entity;
    }

    public static void updateFromRequest(CompetitionTemplate entity, CompetitionTemplateUpdateRequest request) {
        if (request.getShortName() != null) entity.setShortName(request.getShortName());
        if (request.getName() != null) entity.setName(request.getName());
        if (request.getDurationDays() != null) entity.setDurationDays(request.getDurationDays());
        if (request.getQualificationSchemeId() != null) entity.setQualificationSchemeId(request.getQualificationSchemeId());
        if (request.getIsActive() != null) entity.setActive(request.getIsActive());
    }
}
