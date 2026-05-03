package com.bfg.platform.competition.mapper;

import com.bfg.platform.competition.entity.CompetitionFinalStanding;
import com.bfg.platform.competition.entity.CompetitionParticipation;
import com.bfg.platform.gen.model.CompetitionFinalStandingDto;
import com.bfg.platform.gen.model.CompetitionParticipationDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class CompetitionProgressionMapper {

    private CompetitionProgressionMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static CompetitionParticipationDto toDto(CompetitionParticipation entity) {
        if (entity == null) return null;

        CompetitionParticipationDto dto = new CompetitionParticipationDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionEventId(entity.getCompetitionEventId());
        dto.setEntryId(entity.getEntryId());
        dto.setLane(entity.getLane());
        dto.setParticipationStatus(entity.getParticipationStatus());
        dto.setFinishTimeMs(entity.getFinishTimeMs());
        dto.setPlace(entity.getPlace());
        dto.setCreatedAt(entity.getCreatedAt() != null
                ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
                : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
                ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
                : null);
        return dto;
    }

    public static CompetitionFinalStandingDto toDto(CompetitionFinalStanding entity) {
        if (entity == null) return null;

        CompetitionFinalStandingDto dto = new CompetitionFinalStandingDto();
        dto.setUuid(entity.getId());
        dto.setCompetitionId(entity.getCompetitionId());
        dto.setDisciplineId(entity.getDisciplineId());
        dto.setEntryId(entity.getEntryId());
        dto.setOverallRank(entity.getOverallRank());
        dto.setTimeMs(entity.getTimeMs());
        dto.setPoints(entity.getPoints() != null ? entity.getPoints().doubleValue() : null);
        dto.setCreatedAt(entity.getCreatedAt() != null
                ? OffsetDateTime.ofInstant(entity.getCreatedAt(), ZoneOffset.UTC)
                : null);
        dto.setModifiedAt(entity.getModifiedAt() != null
                ? OffsetDateTime.ofInstant(entity.getModifiedAt(), ZoneOffset.UTC)
                : null);
        return dto;
    }
}
