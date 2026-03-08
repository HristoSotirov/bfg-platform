package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationCreateRequest;
import com.bfg.platform.gen.model.AccreditationStatus;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

public class AccreditationMapper {

    private AccreditationMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static AccreditationDto toDto(Accreditation accreditation) {
        return toDto(accreditation, null);
    }

    public static AccreditationDto toDto(Accreditation accreditation, Set<String> expand) {
        if (accreditation == null) return null;

        AccreditationDto dto = new AccreditationDto();
        dto.setUuid(accreditation.getId());
        dto.setAthleteId(accreditation.getAthleteId());
        dto.setClubId(accreditation.getClubId());
        dto.setAccreditationNumber(accreditation.getAccreditationNumber());
        dto.setYear(accreditation.getYear());
        dto.setStatus(accreditation.getStatus());

        dto.setCreatedAt(accreditation.getCreatedAt() != null 
            ? OffsetDateTime.ofInstant(accreditation.getCreatedAt(), ZoneOffset.UTC) 
            : null);
        dto.setUpdatedAt(accreditation.getModifiedAt() != null 
            ? OffsetDateTime.ofInstant(accreditation.getModifiedAt(), ZoneOffset.UTC) 
            : null);

        boolean expandAthlete = expand != null && expand.contains("athlete");
        boolean expandClub = expand != null && expand.contains("club");
        
        if (expandAthlete && accreditation.getAthlete() != null) {
            dto.setAthlete(AthleteMapper.toDto(accreditation.getAthlete()));
        }
        
        if (expandClub && accreditation.getClub() != null) {
            dto.setClub(ClubMapper.toDto(accreditation.getClub(), expand));
        }

        return dto;
    }

    public static Accreditation fromCreateRequest(AccreditationCreateRequest request) {
        Accreditation accreditation = new Accreditation();
        accreditation.setAthleteId(request.getAthleteId());
        accreditation.setClubId(request.getClubId());
        accreditation.setAccreditationNumber(request.getAccreditationNumber());
        accreditation.setYear(request.getYear());
        accreditation.setStatus(request.getStatus());
        
        return accreditation;
    }

    public static Accreditation createNewAccreditation(
            java.util.UUID athleteId,
            java.util.UUID clubId,
            String accreditationNumber,
            Integer year,
            AccreditationStatus status
    ) {
        Accreditation accreditation = new Accreditation();
        accreditation.setAthleteId(athleteId);
        accreditation.setClubId(clubId);
        accreditation.setAccreditationNumber(accreditationNumber);
        accreditation.setYear(year);
        accreditation.setStatus(status);
        return accreditation;
    }
}

