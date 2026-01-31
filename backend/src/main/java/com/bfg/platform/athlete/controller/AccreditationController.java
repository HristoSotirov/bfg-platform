package com.bfg.platform.athlete.controller;

import com.bfg.platform.athlete.service.AccreditationService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.AccreditationsApi;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationListResponse;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class AccreditationController implements AccreditationsApi {

    private final AccreditationService accreditationService;

    // GET methods (Read)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationListResponse> getAllAccreditations(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        var result = accreditationService.getAllAccreditations(filter, search, orderBy, top, skip);
        AccreditationListResponse response = new AccreditationListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent());
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationDto> getAccreditationByUuid(@NotNull(message = "{accreditation.uuid.required}") UUID accreditationUuid) {
        return accreditationService.getAccreditationByUuid(accreditationUuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Accreditation", accreditationUuid));
    }

    // POST methods (Create)
    @Override
    @PreAuthorize("hasAnyAuthority('CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationDto> renewAccreditation(
            @NotNull(message = "{athlete.uuid.required}") UUID athleteId) {
        return accreditationService.renewAccreditation(athleteId)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to renew accreditation"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteBatchMigrationResponse> batchMigrateAthletes(@Valid AthleteBatchMigrationRequest request) {
        AthleteBatchMigrationResponse response = accreditationService.batchMigrateAthletes(request);
        return ResponseEntity.ok(response);
    }

    // PATCH methods (Update)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AccreditationDto> patchAccreditationByUuid(
            @NotNull(message = "{accreditation.uuid.required}") UUID accreditationUuid,
            @NotNull(message = "{accreditation.status.required}") @Valid @RequestBody String body) {
        // Remove JSON quotes if present (e.g., "\"Active\"" -> "Active")
        String statusValue = body.trim();
        if (statusValue.startsWith("\"") && statusValue.endsWith("\"")) {
            statusValue = statusValue.substring(1, statusValue.length() - 1);
        }
        AccreditationStatus status = AccreditationStatus.fromValue(statusValue);
        return accreditationService.updateAccreditation(accreditationUuid, status)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Accreditation", accreditationUuid));
    }
}

