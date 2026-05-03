package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.ScoringScheme;
import com.bfg.platform.gen.model.ScoringSchemeDto;
import com.bfg.platform.gen.model.ScoringSchemeRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class ScoringSchemeMapper {

    private ScoringSchemeMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static ScoringSchemeDto toDto(ScoringScheme entity) {
        if (entity == null) return null;

        ScoringSchemeDto dto = new ScoringSchemeDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setScoringType(entity.getScoringType());
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static ScoringScheme fromRequest(ScoringSchemeRequest request) {
        ScoringScheme entity = new ScoringScheme();
        entity.setName(request.getName().trim());
        entity.setScoringType(request.getScoringType());
        entity.setActive(request.getIsActive());
        return entity;
    }

    public static void updateFromRequest(ScoringScheme entity, ScoringSchemeRequest request) {
        entity.setName(request.getName().trim());
        entity.setScoringType(request.getScoringType());
        entity.setActive(request.getIsActive());
    }
}
