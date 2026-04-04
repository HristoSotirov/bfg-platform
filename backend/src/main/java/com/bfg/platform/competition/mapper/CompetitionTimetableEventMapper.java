package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;
import com.bfg.platform.gen.model.QualificationEventType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionTimetableEventMapper {

    private CompetitionTimetableEventMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionTimetableEventDto toDto(CompetitionTimetableEvent entity) {
        if (entity == null) return null;

        CompetitionTimetableEventDto dto = new CompetitionTimetableEventDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionId(entity.getCompetitionId());
        dto.setDisciplineId(entity.getDisciplineId());
        dto.setQualificationEventType(entity.getQualificationEventType() != null
            ? QualificationEventType.fromValue(entity.getQualificationEventType())
            : null);
        dto.setQualificationStageNumber(entity.getQualificationStageNumber());
        dto.setScheduledAt(entity.getScheduledAt() != null
            ? OffsetDateTime.ofInstant(entity.getScheduledAt(), ZoneOffset.UTC)
            : null);
        dto.setEventStatus(entity.getEventStatus() != null
            ? CompetitionEventStatus.fromValue(entity.getEventStatus())
            : null);
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionTimetableEvent fromRequest(CompetitionTimetableEventRequest request) {
        CompetitionTimetableEvent entity = new CompetitionTimetableEvent();
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
        entity.setQualificationEventType(request.getQualificationEventType() != null
            ? request.getQualificationEventType().getValue()
            : null);
        entity.setQualificationStageNumber(request.getQualificationStageNumber());
        entity.setScheduledAt(request.getScheduledAt() != null
            ? request.getScheduledAt().toInstant()
            : null);
        entity.setEventStatus(request.getEventStatus() != null
            ? request.getEventStatus().getValue()
            : null);
        return entity;
    }

    public static void updateFromRequest(CompetitionTimetableEvent entity, CompetitionTimetableEventRequest request) {
        entity.setCompetitionId(request.getCompetitionId());
        entity.setDisciplineId(request.getDisciplineId());
        entity.setQualificationEventType(request.getQualificationEventType() != null
            ? request.getQualificationEventType().getValue()
            : null);
        entity.setQualificationStageNumber(request.getQualificationStageNumber());
        entity.setScheduledAt(request.getScheduledAt() != null
            ? request.getScheduledAt().toInstant()
            : null);
        entity.setEventStatus(request.getEventStatus() != null
            ? request.getEventStatus().getValue()
            : null);
    }
}
