package com.bfg.platform.club.mapper;

import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.service.UserMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class ClubCoachMapper {

    private ClubCoachMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static ClubCoach fromCreateRequest(ClubCoachCreateRequest request) {
        ClubCoach clubCoach = new ClubCoach();
        clubCoach.setClubId(request.getClubId());
        clubCoach.setCoachId(request.getCoachId());
        return clubCoach;
    }

    public static ClubCoachDto toDto(ClubCoach clubCoach) {
        return toDto(clubCoach, null);
    }

    public static ClubCoachDto toDto(ClubCoach clubCoach, java.util.Set<String> expand) {
        if (clubCoach == null) return null;

        ClubCoachDto dto = new ClubCoachDto();
        dto.setUuid(clubCoach.getId());
        dto.setUserId(clubCoach.getCoachId());
        dto.setClubId(clubCoach.getClubId());
        dto.setAssignmentDate(OffsetDateTime.ofInstant(clubCoach.getAssignmentDate(), ZoneOffset.UTC));

        boolean expandCoach = expand != null && expand.contains("coach");
        boolean expandClub = expand != null && expand.contains("club");
        
        if (expandCoach && clubCoach.getCoach() != null) {
            dto.userName(displayName(clubCoach.getCoach()));
            dto.setCoach(UserMapper.toDto(clubCoach.getCoach()));
        }
        
        if (expandClub && clubCoach.getClub() != null) {
            dto.clubShortName(clubCoach.getClub().getShortName());
            dto.setClub(ClubMapper.toDto(clubCoach.getClub(), expand));
        }
        
        return dto;
    }

    private static String displayName(User user) {
        if (user == null) return null;
        String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String last = user.getLastName() != null ? user.getLastName().trim() : "";
        String combined = (first + " " + last).trim();
        return combined.isEmpty() ? null : combined;
    }
}

