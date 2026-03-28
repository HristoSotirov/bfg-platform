package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionEventTimetableTemplate;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateDto;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateUpdateRequest;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionEventTimetableTemplateMapper {

    private CompetitionEventTimetableTemplateMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionEventTimetableTemplateDto toDto(CompetitionEventTimetableTemplate entity) {
        if (entity == null) return null;

        CompetitionEventTimetableTemplateDto dto = new CompetitionEventTimetableTemplateDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionTemplateId(entity.getCompetitionTemplateId());
        dto.setEventNumber(entity.getEventNumber());
        dto.setQualificationStageNumber(entity.getQualificationStageNumber());
        dto.setDisciplineCode(entity.getDisciplineCode());
        dto.setQualificationEventType(entity.getQualificationEventType());
        dto.setDayOffset(entity.getDayOffset());
        dto.setPlannedTime(entity.getPlannedTime() != null
            ? entity.getPlannedTime().toString()
            : null);
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static CompetitionEventTimetableTemplate fromCreateRequest(CompetitionEventTimetableTemplateCreateRequest request) {
        CompetitionEventTimetableTemplate entity = new CompetitionEventTimetableTemplate();
        entity.setCompetitionTemplateId(request.getCompetitionTemplateId());
        entity.setEventNumber(request.getEventNumber());
        entity.setQualificationStageNumber(request.getQualificationStageNumber());
        entity.setDisciplineCode(request.getDisciplineCode());
        entity.setQualificationEventType(request.getQualificationEventType());
        entity.setDayOffset(request.getDayOffset());
        entity.setPlannedTime(LocalTime.parse(request.getPlannedTime()));
        return entity;
    }

    public static void updateFromRequest(CompetitionEventTimetableTemplate entity, CompetitionEventTimetableTemplateUpdateRequest request) {
        if (request.getEventNumber() != null) entity.setEventNumber(request.getEventNumber());
        if (request.getQualificationStageNumber() != null) entity.setQualificationStageNumber(request.getQualificationStageNumber());
        if (request.getDisciplineCode() != null) entity.setDisciplineCode(request.getDisciplineCode());
        if (request.getQualificationEventType() != null) entity.setQualificationEventType(request.getQualificationEventType());
        if (request.getDayOffset() != null) entity.setDayOffset(request.getDayOffset());
        if (request.getPlannedTime() != null) entity.setPlannedTime(LocalTime.parse(request.getPlannedTime()));
    }
}
