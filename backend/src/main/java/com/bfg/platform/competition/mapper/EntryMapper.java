package com.bfg.platform.competition.mapper;

import com.bfg.platform.athlete.mapper.AccreditationMapper;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.competition.entity.CrewMember;
import com.bfg.platform.competition.entity.Entry;
import com.bfg.platform.gen.model.CrewMemberDto;
import com.bfg.platform.gen.model.EntryDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

public class EntryMapper {

    private EntryMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static EntryDto toDto(Entry entry) {
        return toDto(entry, null);
    }

    public static EntryDto toDto(Entry entry, Set<String> expand) {
        if (entry == null) return null;

        EntryDto dto = new EntryDto();
        dto.setUuid(entry.getId());
        dto.setCompetitionId(entry.getCompetitionId());
        dto.setClubId(entry.getClubId());
        dto.setDisciplineId(entry.getDisciplineId());
        dto.setTeamNumber(entry.getTeamNumber());
        dto.setCreatedAt(entry.getCreatedAt() != null
                ? OffsetDateTime.ofInstant(entry.getCreatedAt(), ZoneOffset.UTC)
                : null);
        dto.setModifiedAt(entry.getModifiedAt() != null
                ? OffsetDateTime.ofInstant(entry.getModifiedAt(), ZoneOffset.UTC)
                : null);

        if (expand != null && expand.contains("club") && entry.getClub() != null) {
            dto.setClub(ClubMapper.toDto(entry.getClub()));
        }

        if (expand != null && expand.contains("crewMembers") && entry.getCrewMembers() != null) {
            Set<String> crewExpand = ExpandQueryParser.subExpand(expand, "crewMembers");
            dto.setCrewMembers(entry.getCrewMembers().stream()
                    .map(cm -> crewMemberToDto(cm, crewExpand))
                    .toList());
        }

        return dto;
    }

    public static CrewMemberDto crewMemberToDto(CrewMember cm) {
        return crewMemberToDto(cm, null);
    }

    public static CrewMemberDto crewMemberToDto(CrewMember cm, Set<String> expand) {
        if (cm == null) return null;

        CrewMemberDto dto = new CrewMemberDto();
        dto.setUuid(cm.getId());
        dto.setEntryId(cm.getEntryId());
        dto.setSeatPosition(cm.getSeatPosition());
        dto.setAccreditationId(cm.getAccreditationId());
        dto.setCreatedAt(cm.getCreatedAt() != null
                ? OffsetDateTime.ofInstant(cm.getCreatedAt(), ZoneOffset.UTC)
                : null);
        dto.setModifiedAt(cm.getModifiedAt() != null
                ? OffsetDateTime.ofInstant(cm.getModifiedAt(), ZoneOffset.UTC)
                : null);

        if (expand != null && expand.contains("accreditation") && cm.getAccreditation() != null) {
            Set<String> accExpand = ExpandQueryParser.subExpand(expand, "accreditation");
            dto.setAccreditation(AccreditationMapper.toDto(cm.getAccreditation(), accExpand));
        }

        return dto;
    }
}
