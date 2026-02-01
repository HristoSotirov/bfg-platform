package com.bfg.platform.club.service;

import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubService {
    Page<ClubDto> getAllClubs(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand);
    Optional<ClubDto> getClubByAdminId(UUID adminId, List<String> expand);
    Optional<ClubDto> getClubDtoByUuid(UUID uuid, List<String> expand);
    
    Optional<ClubDto> createClub(ClubCreateRequest request);
    ClubBatchCreateResponse migrateClubs(ClubBatchCreateRequest request);
    
    Optional<ClubDto> updateClub(UUID uuid, ClubUpdateRequest request);
    Optional<ClubDto> updateClubLogo(UUID uuid, MultipartFile file);
    
    void deleteClub(UUID uuid);
}

