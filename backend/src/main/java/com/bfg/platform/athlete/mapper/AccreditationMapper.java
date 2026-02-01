package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.entity.Athlete;
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

        dto.setCreatedAt(OffsetDateTime.ofInstant(accreditation.getCreatedAt(), ZoneOffset.UTC));
        dto.setUpdatedAt(OffsetDateTime.ofInstant(accreditation.getModifiedAt(), ZoneOffset.UTC));

        boolean expandAthlete = expand != null && expand.contains("athlete");
        boolean expandClub = expand != null && expand.contains("club");
        
        if (expandAthlete && accreditation.getAthlete() != null) {
            String athleteName = displayAthleteName(accreditation.getAthlete());
            dto.setAthleteName(athleteName);
            dto.setAthlete(AthleteMapper.toDto(accreditation.getAthlete()));
        }
        
        if (expandClub && accreditation.getClub() != null) {
            String clubName = accreditation.getClub().getName();
            dto.setClubName(clubName);
            String clubShortName = accreditation.getClub().getShortName();
            dto.setClubShortName(clubShortName);
            dto.setClub(ClubMapper.toDto(accreditation.getClub(), expand));
        }

        return dto;
    }

    private static String displayAthleteName(Athlete athlete) {
        if (athlete == null) return null;
        String first = athlete.getFirstName() != null ? athlete.getFirstName().trim() : "";
        String middle = athlete.getMiddleName() != null ? athlete.getMiddleName().trim() : "";
        String last = athlete.getLastName() != null ? athlete.getLastName().trim() : "";
        String combined = (first + " " + middle + " " + last).trim().replaceAll("\\s+", " ");
        return combined.isEmpty() ? null : combined;
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

