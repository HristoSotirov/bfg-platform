package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.AthletePhotoHistory;
import com.bfg.platform.gen.model.AthletePhotoDto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

public class AthletePhotoMapper {

    private AthletePhotoMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static AthletePhotoDto toDto(AthletePhotoHistory photoHistory) {
        if (photoHistory == null) {
            return null;
        }

        AthletePhotoDto dto = new AthletePhotoDto();
        dto.setUuid(photoHistory.getId());
        dto.setAthleteId(photoHistory.getAthleteId());
        dto.setPhotoUrl(photoHistory.getPhotoUrl());
        dto.setUploadedAt(photoHistory.getUploadedAt() != null
                ? OffsetDateTime.ofInstant(photoHistory.getUploadedAt(), ZoneOffset.UTC)
                : null);
        dto.setUploadedById(photoHistory.getUploadedBy());
        
        if (photoHistory.getUploadedByClub() != null) {
            dto.uploadedByName(photoHistory.getUploadedByClub().getName());
            dto.setUploadedBy(com.bfg.platform.club.mapper.ClubMapper.toDto(photoHistory.getUploadedByClub()));
        }
        
        return dto;
    }

    public static AthletePhotoHistory createPhotoHistory(UUID athleteId, String photoUrl, UUID uploadedByClubId) {
        return AthletePhotoHistory.builder()
                .athleteId(athleteId)
                .photoUrl(photoUrl)
                .uploadedBy(uploadedByClubId)
                .build();
    }
}

