package com.bfg.platform.athlete.controller;

import com.bfg.platform.athlete.service.AccreditationService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.AccreditationsApi;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetAllAccreditations200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class AccreditationController implements AccreditationsApi {

    private final AccreditationService accreditationService;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllAccreditations200Response> getAllAccreditations(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        var page = accreditationService.getAllAccreditations(filter, search, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllAccreditations200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationDto> getAccreditationByUuid(
            UUID accreditationUuid,
            List<String> expand
    ) {
        return accreditationService.getAccreditationByUuid(accreditationUuid, expand)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Accreditation", accreditationUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationDto> renewAccreditation(UUID athleteId) {
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

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AccreditationDto> patchAccreditationStatus(
            UUID accreditationUuid,
            @Valid @RequestBody String body) {
        String statusValue = body.trim();
        if (statusValue.startsWith("\"") && statusValue.endsWith("\"")) {
            statusValue = statusValue.substring(1, statusValue.length() - 1);
        }
        AccreditationStatus status = AccreditationStatus.fromValue(statusValue);
        return accreditationService.updateAccreditationStatus(accreditationUuid, status)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Accreditation", accreditationUuid));
    }
}

