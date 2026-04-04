package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionRequest;
import com.bfg.platform.gen.model.CompetitionStatus;
import com.bfg.platform.gen.model.ScopeType;

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
        dto.setStatus(entity.getStatus() != null ? CompetitionStatus.fromValue(entity.getStatus()) : null);
        dto.setScopeType(entity.getScopeType() != null ? ScopeType.fromValue(entity.getScopeType()) : null);
        dto.setScoringSchemeId(entity.getScoringSchemeId());
        dto.setQualificationSchemeId(entity.getQualificationSchemeId());
        dto.setCreatedAt(entity.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
            : null);

        return dto;
    }

    public static Competition fromRequest(CompetitionRequest request) {
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
        entity.setStatus(request.getStatus() != null ? request.getStatus().getValue() : null);
        entity.setScopeType(request.getScopeType() != null ? request.getScopeType().getValue() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
        return entity;
    }

    public static void updateFromRequest(Competition entity, CompetitionRequest request) {
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
        entity.setStatus(request.getStatus() != null ? request.getStatus().getValue() : null);
        entity.setScopeType(request.getScopeType() != null ? request.getScopeType().getValue() : null);
        entity.setScoringSchemeId(request.getScoringSchemeId());
        entity.setQualificationSchemeId(request.getQualificationSchemeId());
    }
}
