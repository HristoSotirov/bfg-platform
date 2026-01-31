package com.bfg.platform.athlete.service;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.gen.model.AthleteFacets;
import com.bfg.platform.gen.model.AthleteUpdateRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AthleteService {
    // GET methods (Read)
    ListResult<AthleteDto, AthleteFacets> getAllAthletes(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    );
    Optional<AthleteDto> getAthleteDtoByUuid(UUID uuid);
    
    // PATCH methods (Update)
    Optional<AthleteDto> updateAthlete(UUID uuid, AthleteUpdateRequest request);
    List<AthleteDto> batchUpdateMedicalInfo(com.bfg.platform.gen.model.AthleteBatchMedicalUpdateRequest request);
    
    // DELETE methods
    void deleteAthlete(UUID uuid);
}

