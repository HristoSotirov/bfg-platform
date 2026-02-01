package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.AthletePhotoHistory;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.gen.model.AthletePhotoDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

public class AthletePhotoMapper {

    private AthletePhotoMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static AthletePhotoDto toDto(AthletePhotoHistory photoHistory) {
        return toDto(photoHistory, null);
    }

    public static AthletePhotoDto toDto(AthletePhotoHistory photoHistory, java.util.Set<String> expand) {
        if (photoHistory == null) {
            return null;
        }

        AthletePhotoDto dto = new AthletePhotoDto();
        dto.setUuid(photoHistory.getId());
        dto.setAthleteId(photoHistory.getAthleteId());
        dto.setPhotoUrl(photoHistory.getPhotoUrl());
        dto.setUploadedAt(OffsetDateTime.ofInstant(photoHistory.getUploadedAt(), ZoneOffset.UTC));
        dto.setUploadedById(photoHistory.getUploadedBy());
        
        boolean expandUploadedByClub = expand != null && expand.contains("uploadedByClub");
        
        if (expandUploadedByClub && photoHistory.getUploadedByClub() != null) {
            dto.uploadedByName(photoHistory.getUploadedByClub().getName());
            dto.setUploadedBy(ClubMapper.toDto(photoHistory.getUploadedByClub(), expand));
        }
        
        return dto;
    }

    public static AthletePhotoHistory createPhotoHistory(UUID athleteId, String photoUrl, UUID uploadedByClubId) {
        return AthletePhotoHistory.builder()
                .id(UUID.randomUUID())
                .athleteId(athleteId)
                .photoUrl(photoUrl)
                .uploadedBy(uploadedByClubId)
                .build();
    }
}

