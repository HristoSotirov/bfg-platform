package com.bfg.platform.athlete.service;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.AccreditationCreateRequest;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationFacets;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;

import java.util.Optional;
import java.util.UUID;

public interface AccreditationService {
    // GET methods (Read)
    ListResult<AccreditationDto, AccreditationFacets> getAllAccreditations(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    );
    Optional<AccreditationDto> getAccreditationByUuid(UUID uuid);
    
    // POST methods (Create)
    Optional<AccreditationDto> renewAccreditation(UUID athleteId);
    Optional<AthleteDto> createAthleteWithAccreditation(AthleteCreateRequest request);
    AthleteBatchMigrationResponse batchMigrateAthletes(AthleteBatchMigrationRequest request);
    
    // PATCH methods (Update)
    Optional<AccreditationDto> updateAccreditation(UUID uuid, AccreditationStatus status);
}

