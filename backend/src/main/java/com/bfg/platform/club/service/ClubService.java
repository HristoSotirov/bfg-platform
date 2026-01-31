package com.bfg.platform.club.service;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubFacets;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.UUID;

public interface ClubService {
    // GET methods (Read)
    ListResult<ClubDto, ClubFacets> getAllClubs(String filter, String search, String orderBy, Integer top, Integer skip);
    Optional<ClubDto> getClubByAdminId(UUID adminId);
    Optional<ClubDto> getClubDtoByUuid(UUID uuid);
    
    // POST methods (Create)
    Optional<ClubDto> createClub(ClubCreateRequest request);
    ClubBatchCreateResponse migrateClubs(ClubBatchCreateRequest request);
    
    // PATCH methods (Update)
    Optional<ClubDto> updateClub(UUID uuid, ClubUpdateRequest request);
    Optional<ClubDto> updateClubLogo(UUID uuid, MultipartFile file);
    
    // DELETE methods
    void deleteClub(UUID uuid);
}

