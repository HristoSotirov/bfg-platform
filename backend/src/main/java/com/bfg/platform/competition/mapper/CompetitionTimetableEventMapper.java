package com.bfg.platform.competition.mapper;

import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

public class CompetitionTimetableEventMapper {

    private CompetitionTimetableEventMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionTimetableEventDto toDto(CompetitionTimetableEvent entity) {
        return toDto(entity, null);
    }

    public static CompetitionTimetableEventDto toDto(CompetitionTimetableEvent entity, Set<String> expand) {
        if (entity == null) return null;

        CompetitionTimetableEventDto dto = new CompetitionTimetableEventDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionId(entity.getCompetitionId());
        dto.setDisciplineId(entity.getDisciplineId());
        dto.setQualificationEventType(entity.getQualificationEventType());
        dto.setScheduledAt(entity.getScheduledAt() != null
            ? OffsetDateTime.ofInstant(entity.getScheduledAt(), ZoneOffset.UTC)
            : null);
        dto.setEventStatus(entity.getEventStatus());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        // Hybrid expand: deeper level implies parent
        boolean expandDiscipline = expand != null && expand.contains("discipline");

        if (expandDiscipline && entity.getDiscipline() != null) {
            Set<String> disciplineExpand = ExpandQueryParser.subExpand(expand, "discipline");
            dto.setDiscipline(DisciplineDefinitionMapper.toDto(entity.getDiscipline(), disciplineExpand));
        }

        return dto;
    }

    public static CompetitionTimetableEvent fromRequest(CompetitionTimetableEventRequest request) {
        CompetitionTimetableEvent entity = new CompetitionTimetableEvent();
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
        entity.setQualificationEventType(request.getQualificationEventType());
        entity.setScheduledAt(request.getScheduledAt() != null
            ? request.getScheduledAt().toInstant()
            : null);
        entity.setEventStatus(request.getEventStatus());
        return entity;
    }

    public static void updateFromRequest(CompetitionTimetableEvent entity, CompetitionTimetableEventRequest request) {
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
        entity.setQualificationEventType(request.getQualificationEventType());
        entity.setScheduledAt(request.getScheduledAt() != null
            ? request.getScheduledAt().toInstant()
            : null);
        entity.setEventStatus(request.getEventStatus());
    }
}
