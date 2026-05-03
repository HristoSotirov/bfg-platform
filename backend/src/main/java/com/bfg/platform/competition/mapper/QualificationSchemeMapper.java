package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.gen.model.QualificationSchemeDto;
import com.bfg.platform.gen.model.QualificationSchemeRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class QualificationSchemeMapper {

    private QualificationSchemeMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static QualificationSchemeDto toDto(QualificationScheme entity) {
        if (entity == null) return null;

        QualificationSchemeDto dto = new QualificationSchemeDto();
        dto.setUuid(entity.getId());
        dto.setName(entity.getName());
        dto.setLaneCount(entity.getLaneCount());
        dto.setIsActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static QualificationScheme fromRequest(QualificationSchemeRequest request) {
        QualificationScheme entity = new QualificationScheme();
        entity.setName(request.getName().trim());
        entity.setLaneCount(request.getLaneCount());
        entity.setActive(request.getIsActive());
        return entity;
    }

    public static void updateFromRequest(QualificationScheme entity, QualificationSchemeRequest request) {
        entity.setName(request.getName().trim());
        entity.setLaneCount(request.getLaneCount());
        entity.setActive(request.getIsActive());
    }
}
