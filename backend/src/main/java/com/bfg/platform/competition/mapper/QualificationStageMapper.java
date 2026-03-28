package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.QualificationStage;
import com.bfg.platform.gen.model.QualificationStageDto;
import com.bfg.platform.gen.model.QualificationStageRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class QualificationStageMapper {

    private QualificationStageMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static QualificationStageDto toDto(QualificationStage entity) {
        if (entity == null) return null;

        QualificationStageDto dto = new QualificationStageDto();
        dto.setUuid(entity.getId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setBoatCountMin(entity.getBoatCountMin());
        dto.setBoatCountMax(entity.getBoatCountMax());
        dto.setQualificationEventType(entity.getQualificationEventType());
        dto.setEventCount(entity.getEventCount());
        dto.setStageRank(entity.getStageRank());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static QualificationStage fromRequest(QualificationStageRequest request) {
        QualificationStage entity = new QualificationStage();
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setBoatCountMin(request.getBoatCountMin());
        entity.setBoatCountMax(request.getBoatCountMax());
        entity.setQualificationEventType(request.getQualificationEventType());
        entity.setEventCount(request.getEventCount());
        entity.setStageRank(request.getStageRank());
        return entity;
    }

    public static void updateFromRequest(QualificationStage entity, QualificationStageRequest request) {
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setBoatCountMin(request.getBoatCountMin());
        entity.setBoatCountMax(request.getBoatCountMax());
        entity.setQualificationEventType(request.getQualificationEventType());
        entity.setEventCount(request.getEventCount());
        entity.setStageRank(request.getStageRank());
    }
}
