package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.gen.model.CompetitionCreateRequest;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionUpdateRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionMapper {

    private CompetitionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionDto toDto(Competition entity) {
        if (entity == null) return null;

        CompetitionDto dto = new CompetitionDto();
        dto.setUuid(entity.getId());
        dto.setShortName(entity.getShortName());
        dto.setName(entity.getName());
        dto.setLocation(entity.getLocation());
        dto.setStartDate(entity.getStartDate());
        dto.setEndDate(entity.getEndDate());
        dto.setEntrySubmissionsOpenAt(entity.getEntrySubmissionsOpenAt() != null
            ? OffsetDateTime.ofInstant(entity.getEntrySubmissionsOpenAt(), ZoneOffset.UTC) : null);
        dto.setEntrySubmissionsClosedAt(entity.getEntrySubmissionsClosedAt() != null
            ? OffsetDateTime.ofInstant(entity.getEntrySubmissionsClosedAt(), ZoneOffset.UTC) : null);
        dto.setLastChangesBeforeTmAt(entity.getLastChangesBeforeTmAt() != null
            ? OffsetDateTime.ofInstant(entity.getLastChangesBeforeTmAt(), ZoneOffset.UTC) : null);
        dto.setTechnicalMeetingAt(entity.getTechnicalMeetingAt() != null
            ? OffsetDateTime.ofInstant(entity.getTechnicalMeetingAt(), ZoneOffset.UTC) : null);
        dto.setAwardingCeremonyAt(entity.getAwardingCeremonyAt() != null
            ? OffsetDateTime.ofInstant(entity.getAwardingCeremonyAt(), ZoneOffset.UTC) : null);
        dto.setScoringSchemeId(entity.getScoringSchemeId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setCompetitionType(entity.getCompetitionType());
        dto.setIsTemplate(entity.isTemplate());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static Competition fromRequest(CompetitionCreateRequest request) {
        Competition entity = new Competition();
        entity.setShortName(request.getShortName());
        entity.setName(request.getName());
        entity.setLocation(request.getLocation());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setEntrySubmissionsOpenAt(request.getEntrySubmissionsOpenAt() != null
            ? request.getEntrySubmissionsOpenAt().toInstant() : null);
        entity.setEntrySubmissionsClosedAt(request.getEntrySubmissionsClosedAt() != null
            ? request.getEntrySubmissionsClosedAt().toInstant() : null);
        entity.setLastChangesBeforeTmAt(request.getLastChangesBeforeTmAt() != null
            ? request.getLastChangesBeforeTmAt().toInstant() : null);
        entity.setTechnicalMeetingAt(request.getTechnicalMeetingAt() != null
            ? request.getTechnicalMeetingAt().toInstant() : null);
        entity.setAwardingCeremonyAt(request.getAwardingCeremonyAt() != null
            ? request.getAwardingCeremonyAt().toInstant() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setCompetitionType(request.getCompetitionType());
        entity.setTemplate(Boolean.TRUE.equals(request.getIsTemplate()));
        return entity;
    }

    public static void updateFromRequest(Competition entity, CompetitionUpdateRequest request) {
        entity.setShortName(request.getShortName());
        entity.setName(request.getName());
        entity.setLocation(request.getLocation());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setEntrySubmissionsOpenAt(request.getEntrySubmissionsOpenAt() != null
            ? request.getEntrySubmissionsOpenAt().toInstant() : null);
        entity.setEntrySubmissionsClosedAt(request.getEntrySubmissionsClosedAt() != null
            ? request.getEntrySubmissionsClosedAt().toInstant() : null);
        entity.setLastChangesBeforeTmAt(request.getLastChangesBeforeTmAt() != null
            ? request.getLastChangesBeforeTmAt().toInstant() : null);
        entity.setTechnicalMeetingAt(request.getTechnicalMeetingAt() != null
            ? request.getTechnicalMeetingAt().toInstant() : null);
        entity.setAwardingCeremonyAt(request.getAwardingCeremonyAt() != null
            ? request.getAwardingCeremonyAt().toInstant() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        entity.setCompetitionType(request.getCompetitionType());
        // isTemplate is intentionally not updated — it is immutable after creation
    }
}
