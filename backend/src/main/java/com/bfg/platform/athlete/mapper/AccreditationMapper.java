package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationCreateRequest;
import com.bfg.platform.gen.model.AccreditationStatus;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class AccreditationMapper {

    private AccreditationMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static AccreditationDto toDto(Accreditation accreditation) {
        if (accreditation == null) return null;

        AccreditationDto dto = new AccreditationDto();
        dto.setUuid(accreditation.getId());
        dto.setAthleteId(accreditation.getAthleteId());
        String athleteName = displayAthleteName(accreditation.getAthlete());
        dto.setAthleteName(athleteName);
        dto.setClubId(accreditation.getClubId());
        String clubName = accreditation.getClub() != null ? accreditation.getClub().getName() : null;
        dto.setClubName(clubName);
        String clubShortName = accreditation.getClub() != null ? accreditation.getClub().getShortName() : null;
        dto.setClubShortName(clubShortName);
        dto.setAccreditationNumber(accreditation.getAccreditationNumber());
        dto.setYear(accreditation.getYear());
        dto.setStatus(accreditation.getStatus());

        dto.setCreatedAt(accreditation.getCreatedAt() != null
                ? OffsetDateTime.ofInstant(accreditation.getCreatedAt(), ZoneOffset.UTC)
                : null);
        dto.setUpdatedAt(accreditation.getModifiedAt() != null
                ? OffsetDateTime.ofInstant(accreditation.getModifiedAt(), ZoneOffset.UTC)
                : null);

        if (accreditation.getClub() != null) {
            dto.setClub(ClubMapper.toDto(accreditation.getClub()));
        }

        if (accreditation.getAthlete() != null) {
            dto.setAthlete(AthleteMapper.toDto(accreditation.getAthlete()));
        }

        return dto;
    }

    private static String displayAthleteName(com.bfg.platform.athlete.entity.Athlete athlete) {
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

