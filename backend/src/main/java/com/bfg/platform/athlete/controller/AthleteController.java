package com.bfg.platform.athlete.controller;

import com.bfg.platform.gen.api.AthletesApi;
import com.bfg.platform.athlete.service.AthleteService;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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

    // GET methods (Read)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AthleteListResponse> getAllAthletes(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        var result = athleteService.getAllAthletes(filter, search, orderBy, top, skip);
        AthleteListResponse response = new AthleteListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent());
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AthleteDto> getAthleteByUuid(@NotNull(message = "{athlete.uuid.required}") UUID athleteUuid) {
        return athleteService.getAthleteDtoByUuid(athleteUuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Athlete", athleteUuid));
    }

    // PATCH methods (Update)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteDto> patchAthleteByUuid(@NotNull(message = "{athlete.uuid.required}") UUID athleteUuid,
                                                             @Valid AthleteUpdateRequest request) {
        return athleteService.updateAthlete(athleteUuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Athlete", athleteUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteListResponse> batchUpdateMedicalInfo(@Valid AthleteBatchMedicalUpdateRequest request) {
        List<AthleteDto> updated = athleteService.batchUpdateMedicalInfo(request);
        AthleteListResponse response = new AthleteListResponse()
                .count(updated.size())
                .value(updated);
        return ResponseEntity.ok(response);
    }

    // DELETE methods
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteAthlete(@NotNull(message = "{athlete.uuid.required}") UUID athleteUuid) {
        athleteService.deleteAthlete(athleteUuid);
        return ResponseEntity.noContent().build();
    }
}

