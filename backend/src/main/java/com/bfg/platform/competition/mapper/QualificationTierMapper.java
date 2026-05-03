package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.QualificationTier;
import com.bfg.platform.gen.model.QualificationTierDto;
import com.bfg.platform.gen.model.QualificationTierRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class QualificationTierMapper {

    private QualificationTierMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static QualificationTierDto toDto(QualificationTier entity) {
        if (entity == null) return null;

        QualificationTierDto dto = new QualificationTierDto();
        dto.setUuid(entity.getId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setBoatCountMin(entity.getBoatCountMin());
        dto.setBoatCountMax(entity.getBoatCountMax());
        dto.setHeatCount(entity.getHeatCount());
        dto.setSemiFinalCount(entity.getSemiFinalCount());
        dto.setFinalBCount(entity.getFinalBCount());
        dto.setFinalACount(entity.getFinalACount());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static QualificationTier fromRequest(QualificationTierRequest request) {
        QualificationTier entity = new QualificationTier();
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setBoatCountMin(request.getBoatCountMin());
        entity.setBoatCountMax(request.getBoatCountMax());
        entity.setHeatCount(request.getHeatCount());
        entity.setSemiFinalCount(request.getSemiFinalCount());
        entity.setFinalBCount(request.getFinalBCount());
        entity.setFinalACount(request.getFinalACount());
        return entity;
    }

    public static void updateFromRequest(QualificationTier entity, QualificationTierRequest request) {
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setBoatCountMin(request.getBoatCountMin());
        entity.setBoatCountMax(request.getBoatCountMax());
        entity.setHeatCount(request.getHeatCount());
        entity.setSemiFinalCount(request.getSemiFinalCount());
        entity.setFinalBCount(request.getFinalBCount());
        entity.setFinalACount(request.getFinalACount());
    }
}
