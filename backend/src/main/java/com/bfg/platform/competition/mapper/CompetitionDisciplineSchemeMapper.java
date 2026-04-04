package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.stream.Collectors;

public class CompetitionDisciplineSchemeMapper {

    private CompetitionDisciplineSchemeMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionDisciplineSchemeDto toDto(CompetitionDisciplineScheme entity) {
        return toDto(entity, null);
    }

    public static CompetitionDisciplineSchemeDto toDto(CompetitionDisciplineScheme entity, Set<String> expand) {
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

        if (expand != null && expand.contains("discipline") && entity.getDiscipline() != null) {
            Set<String> disciplineExpand = expand.stream()
                .filter(e -> e.startsWith("discipline."))
                .map(e -> e.substring("discipline.".length()))
                .collect(Collectors.toSet());
            dto.setDiscipline(DisciplineDefinitionMapper.toDto(entity.getDiscipline(), disciplineExpand));
        }

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
