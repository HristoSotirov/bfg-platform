package com.bfg.platform.club.mapper;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.gen.model.ClubBatchCreateRequestItem;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import com.bfg.platform.user.service.UserMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;


public class ClubMapper {

    private ClubMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static ClubDto toDto(Club club) {
        return toDto(club, null);
    }

    public static ClubDto toDto(Club club, Set<String> expand) {
        if (club == null) return null;

        ClubDto dto = new ClubDto();
        dto.setUuid(club.getId());
        dto.setName(club.getName());
        dto.setShortName(club.getShortName());
        dto.setLogoUrl(club.getLogoUrl());
        dto.setCardPrefix(club.getCardPrefix());
        dto.setClubEmail(club.getClubEmail());
        dto.setIsActive(club.isActive());
        dto.clubAdminId(club.getClubAdmin());
        dto.setCreatedAt(club.getCreatedAt() != null 
            ? OffsetDateTime.ofInstant(club.getCreatedAt(), ZoneOffset.UTC) 
            : null);
        dto.setUpdatedAt(club.getModifiedAt() != null 
            ? OffsetDateTime.ofInstant(club.getModifiedAt(), ZoneOffset.UTC) 
            : null);
        
        boolean expandClubAdminUser = expand != null && expand.contains("clubAdminUser");
        
        if (expandClubAdminUser && club.getClubAdminUser() != null) {
            dto.clubAdminUser(UserMapper.toDto(club.getClubAdminUser()));
        }

        return dto;
    }

    public static Club fromCreateRequest(ClubCreateRequest request) {
        return fromCreateRequest(request, request.getCardPrefix());
    }

    public static Club fromCreateRequest(ClubCreateRequest request, String cardPrefix) {
        Club club = new Club();
        club.setName(request.getName());
        club.setShortName(request.getShortName());
        club.setCardPrefix(cardPrefix);
        club.setClubEmail(request.getClubEmail());
        club.setClubAdmin(request.getClubAdminId());
        return club;
    }

    public static void updateClubFromRequest(Club club, ClubUpdateRequest request) {
        if (request.getName() != null) club.setName(request.getName());
        if (request.getShortName() != null) club.setShortName(request.getShortName());
        if (request.getIsActive() != null) club.setActive(request.getIsActive());
        if (request.getClubAdminId() != null) club.setClubAdmin(request.getClubAdminId());
    }

    public static Club fromBatchCreateRequestItem(ClubBatchCreateRequestItem item, UUID adminUserId) {
        Club club = new Club();
        club.setName(item.getName());
        club.setShortName(item.getShortName());
        club.setCardPrefix(item.getCardPrefix());
        club.setClubEmail(item.getClubEmail());
        club.setClubAdmin(adminUserId);
        club.setActive(true);
        return club;
    }

}

