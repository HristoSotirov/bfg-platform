package com.bfg.platform.athlete.controller;

import com.bfg.platform.gen.api.AthletesApi;
import com.bfg.platform.athlete.service.AthleteService;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.model.*;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetAllAthletes200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class AthleteController implements AthletesApi {

    private final AthleteService athleteService;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllAthletes200Response> getAllAthletes(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        var page = athleteService.getAllAthletes(filter, search, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllAthletes200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AthleteDto> getAthleteByUuid(
            UUID athleteUuid,
            List<String> expand
    ) {
        return athleteService.getAthleteDtoByUuid(athleteUuid, expand)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Athlete", athleteUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteDto> patchAthleteByUuid(UUID athleteUuid,
                                                             @Valid AthleteUpdateRequest request) {
        return athleteService.updateAthlete(athleteUuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Athlete", athleteUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<List<AthleteDto>> batchUpdateMedicalInfo(@Valid AthleteBatchMedicalUpdateRequest request) {
        return ResponseEntity.ok(athleteService.batchUpdateMedicalInfo(request));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteAthlete(UUID athleteUuid) {
        athleteService.deleteAthlete(athleteUuid);
        return ResponseEntity.noContent().build();
    }
}

