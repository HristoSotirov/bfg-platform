package com.bfg.platform.club.mapper;

import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.service.UserMapper;

import java.time.OffsetDateTime;

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
        if (clubCoach == null) return null;

        ClubCoachDto dto = new ClubCoachDto();
        dto.setUuid(clubCoach.getId());
        dto.setUserId(clubCoach.getCoachId());
        dto.setClubId(clubCoach.getClubId());
        dto.setAssignmentDate(OffsetDateTime.from(clubCoach.getAssignmentDate()));

        dto.userName(displayName(clubCoach.getCoach()));
        dto.clubShortName(clubCoach.getClub() != null ? clubCoach.getClub().getShortName() : null);
        if (clubCoach.getCoach() != null) {
            dto.setCoach(UserMapper.toDto(clubCoach.getCoach()));
        }
        if (clubCoach.getClub() != null) {
            dto.setClub(ClubMapper.toDto(clubCoach.getClub()));
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

