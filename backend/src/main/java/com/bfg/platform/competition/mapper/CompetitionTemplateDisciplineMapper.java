package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionTemplateDiscipline;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionTemplateDisciplineMapper {

    private CompetitionTemplateDisciplineMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionTemplateDisciplineDto toDto(CompetitionTemplateDiscipline entity) {
        if (entity == null) return null;

        CompetitionTemplateDisciplineDto dto = new CompetitionTemplateDisciplineDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionTemplateId(entity.getCompetitionTemplateId());
        dto.setDisciplineId(entity.getDisciplineId());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionTemplateDiscipline fromCreateRequest(CompetitionTemplateDisciplineCreateRequest request) {
        CompetitionTemplateDiscipline entity = new CompetitionTemplateDiscipline();
        entity.setCompetitionTemplateId(request.getCompetitionTemplateId());
        entity.setDisciplineId(request.getDisciplineId());
        return entity;
    }
}
