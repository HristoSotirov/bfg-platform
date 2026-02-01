package com.bfg.platform.athlete.service;

import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.gen.model.AthleteUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AthleteService {
    Page<AthleteDto> getAllAthletes(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    );
    Optional<AthleteDto> getAthleteDtoByUuid(UUID uuid, List<String> expand);
    
    Optional<AthleteDto> updateAthlete(UUID uuid, AthleteUpdateRequest request);
    List<AthleteDto> batchUpdateMedicalInfo(com.bfg.platform.gen.model.AthleteBatchMedicalUpdateRequest request);
    
    void deleteAthlete(UUID uuid);
}

