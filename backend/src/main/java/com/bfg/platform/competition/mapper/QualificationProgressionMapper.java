package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.QualificationProgressionDto;
import com.bfg.platform.gen.model.QualificationProgressionRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class QualificationProgressionMapper {

    private QualificationProgressionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static QualificationProgressionDto toDto(QualificationProgression entity) {
        if (entity == null) return null;

        QualificationProgressionDto dto = new QualificationProgressionDto();
        dto.setUuid(entity.getId());
        dto.setQualificationTierId(entity.getQualificationTierId());
        dto.setSourceEvent(entity.getSourceEvent() != null ? entity.getSourceEvent().getValue() : null);
        dto.setDestEvent(entity.getDestEvent() != null ? entity.getDestEvent().getValue() : null);
        dto.setQualifyByPosition(entity.getQualifyByPosition());
        dto.setQualifyByTime(entity.getQualifyByTime());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static QualificationProgression fromRequest(QualificationProgressionRequest request) {
        QualificationProgression entity = new QualificationProgression();
        entity.setQualificationTierId(request.getQualificationTierId());
        entity.setSourceEvent(request.getSourceEvent() != null ? QualificationEventType.fromValue(request.getSourceEvent()) : null);
        entity.setDestEvent(request.getDestEvent() != null ? QualificationEventType.fromValue(request.getDestEvent()) : null);
        entity.setQualifyByPosition(request.getQualifyByPosition());
        entity.setQualifyByTime(request.getQualifyByTime());
        return entity;
    }

    public static void updateFromRequest(QualificationProgression entity, QualificationProgressionRequest request) {
        entity.setQualificationTierId(request.getQualificationTierId());
        entity.setSourceEvent(request.getSourceEvent() != null ? QualificationEventType.fromValue(request.getSourceEvent()) : null);
        entity.setDestEvent(request.getDestEvent() != null ? QualificationEventType.fromValue(request.getDestEvent()) : null);
        entity.setQualifyByPosition(request.getQualifyByPosition());
        entity.setQualifyByTime(request.getQualifyByTime());
    }
}
