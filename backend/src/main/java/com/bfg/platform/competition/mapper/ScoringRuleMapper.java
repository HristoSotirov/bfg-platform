package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.ScoringRule;
import com.bfg.platform.gen.model.ScoringRuleDto;
import com.bfg.platform.gen.model.ScoringRuleRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class ScoringRuleMapper {

    private ScoringRuleMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static ScoringRuleDto toDto(ScoringRule entity) {
        if (entity == null) return null;

        ScoringRuleDto dto = new ScoringRuleDto();
        dto.setUuid(entity.getId());
        dto.setScoringSchemeId(entity.getScoringSchemeId());
        dto.setPlacement(entity.getPlacement());
        dto.setBasePoints(entity.getBasePoints() != null ? entity.getBasePoints().doubleValue() : null);
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static ScoringRule fromRequest(ScoringRuleRequest request) {
        ScoringRule entity = new ScoringRule();
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setPlacement(request.getPlacement());
        entity.setBasePoints(request.getBasePoints() != null ? BigDecimal.valueOf(request.getBasePoints()) : null);
        return entity;
    }

    public static void updateFromRequest(ScoringRule entity, ScoringRuleRequest request) {
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setPlacement(request.getPlacement());
        entity.setBasePoints(request.getBasePoints() != null ? BigDecimal.valueOf(request.getBasePoints()) : null);
    }
}
