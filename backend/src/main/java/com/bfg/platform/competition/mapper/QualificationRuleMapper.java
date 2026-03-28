package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.QualificationRule;
import com.bfg.platform.gen.model.QualificationRuleDto;
import com.bfg.platform.gen.model.QualificationRuleRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class QualificationRuleMapper {

    private QualificationRuleMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static QualificationRuleDto toDto(QualificationRule entity) {
        if (entity == null) return null;

        QualificationRuleDto dto = new QualificationRuleDto();
        dto.setUuid(entity.getId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setSourceStageId(entity.getSourceStageId());
        dto.setDestinationStageId(entity.getDestinationStageId());
        dto.setQualifyByPosition(entity.getQualifyByPosition());
        dto.setBaseQualifyByTime(entity.getBaseQualifyByTime());
        dto.setMaxQualifyByTime(entity.getMaxQualifyByTime());
        dto.setIsRemainder(entity.isRemainder());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static QualificationRule fromRequest(QualificationRuleRequest request) {
        QualificationRule entity = new QualificationRule();
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setSourceStageId(request.getSourceStageId());
        entity.setDestinationStageId(request.getDestinationStageId());
        entity.setQualifyByPosition(request.getQualifyByPosition());
        entity.setBaseQualifyByTime(request.getBaseQualifyByTime());
        entity.setMaxQualifyByTime(request.getMaxQualifyByTime());
        entity.setRemainder(request.getIsRemainder());
        return entity;
    }

    public static void updateFromRequest(QualificationRule entity, QualificationRuleRequest request) {
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setSourceStageId(request.getSourceStageId());
        entity.setDestinationStageId(request.getDestinationStageId());
        entity.setQualifyByPosition(request.getQualifyByPosition());
        entity.setBaseQualifyByTime(request.getBaseQualifyByTime());
        entity.setMaxQualifyByTime(request.getMaxQualifyByTime());
        entity.setRemainder(request.getIsRemainder());
    }
}
