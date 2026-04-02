package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionDisciplineSchemeMapper {

    private CompetitionDisciplineSchemeMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionDisciplineSchemeDto toDto(CompetitionDisciplineScheme entity) {
        if (entity == null) return null;

        CompetitionDisciplineSchemeDto dto = new CompetitionDisciplineSchemeDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionId(entity.getCompetitionId());
        dto.setDisciplineId(entity.getDisciplineId());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionDisciplineScheme fromRequest(CompetitionDisciplineSchemeRequest request) {
        CompetitionDisciplineScheme entity = new CompetitionDisciplineScheme();
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
        return entity;
    }

    public static void updateFromRequest(CompetitionDisciplineScheme entity, CompetitionDisciplineSchemeRequest request) {
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
    }
}
