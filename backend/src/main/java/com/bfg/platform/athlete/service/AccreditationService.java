package com.bfg.platform.athlete.service;

import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccreditationService {
    Page<AccreditationDto> getAllAccreditations(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    );
    Optional<AccreditationDto> getAccreditationByUuid(UUID uuid, List<String> expand);
    
    Optional<AccreditationDto> renewAccreditation(UUID athleteId);
    Optional<AthleteDto> createAthleteWithAccreditation(AthleteCreateRequest request);
    AthleteBatchMigrationResponse batchMigrateAthletes(AthleteBatchMigrationRequest request);
    
    Optional<AccreditationDto> updateAccreditationStatus(UUID uuid, AccreditationStatus status);
}

