package com.bfg.platform.club.service;

import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubDto;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubCoachService {
    Page<ClubCoachDto> getCoachesByClubId(UUID clubId, String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand);
    Optional<ClubDto> getClubByCoachId(UUID coachId, List<String> expand);
    
    Optional<ClubCoachDto> assignCoachToClub(ClubCoachCreateRequest request);
    
    void removeCoachFromClub(UUID clubCoachId);
}

