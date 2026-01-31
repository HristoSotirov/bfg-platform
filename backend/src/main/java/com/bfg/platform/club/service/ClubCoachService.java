package com.bfg.platform.club.service;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubCoachFacets;
import com.bfg.platform.gen.model.ClubDto;

import java.util.Optional;
import java.util.UUID;

public interface ClubCoachService {
    // GET methods (Read)
    ListResult<ClubCoachDto, ClubCoachFacets> getCoachesByClubId(UUID clubId, String filter, String orderBy, Integer top, Integer skip);
    Optional<ClubDto> getClubByCoachId(UUID coachId);
    
    // POST methods (Create)
    Optional<ClubCoachDto> assignCoachToClub(ClubCoachCreateRequest request);
    
    // DELETE methods
    void removeCoachFromClub(UUID clubCoachId);
}

