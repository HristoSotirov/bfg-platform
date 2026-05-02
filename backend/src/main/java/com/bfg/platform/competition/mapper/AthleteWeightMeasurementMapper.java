package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.AthleteWeightMeasurement;
import com.bfg.platform.gen.model.AthleteWeightMeasurementDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class AthleteWeightMeasurementMapper {

    private AthleteWeightMeasurementMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static AthleteWeightMeasurementDto toDto(AthleteWeightMeasurement entity) {
        if (entity == null) return null;

        AthleteWeightMeasurementDto dto = new AthleteWeightMeasurementDto();
        dto.setUuid(entity.getId());
        dto.setAthleteId(entity.getAthleteId());
        dto.setWeightKg(entity.getWeightKg() != null ? entity.getWeightKg().doubleValue() : null);
        dto.setRole(entity.getRole());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);
        return dto;
    }
}
