package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientDto;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class ScoringSchemeBoatCoefficientMapper {

    private ScoringSchemeBoatCoefficientMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static ScoringSchemeBoatCoefficientDto toDto(ScoringSchemeBoatCoefficient entity) {
        if (entity == null) return null;

        ScoringSchemeBoatCoefficientDto dto = new ScoringSchemeBoatCoefficientDto();
        dto.setUuid(entity.getId());
        dto.setScoringSchemeId(entity.getScoringSchemeId());
        dto.setBoatClass(entity.getBoatClass());
        dto.setCoefficient(entity.getCoefficient() != null ? entity.getCoefficient().doubleValue() : null);
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static ScoringSchemeBoatCoefficient fromRequest(ScoringSchemeBoatCoefficientRequest request) {
        ScoringSchemeBoatCoefficient entity = new ScoringSchemeBoatCoefficient();
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setBoatClass(request.getBoatClass());
        entity.setCoefficient(request.getCoefficient() != null ? BigDecimal.valueOf(request.getCoefficient()) : null);
        return entity;
    }

    public static void updateFromRequest(ScoringSchemeBoatCoefficient entity, ScoringSchemeBoatCoefficientRequest request) {
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setBoatClass(request.getBoatClass());
        entity.setCoefficient(request.getCoefficient() != null ? BigDecimal.valueOf(request.getCoefficient()) : null);
    }
}
