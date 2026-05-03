package com.bfg.platform.athlete.controller;

import com.bfg.platform.athlete.service.AccreditationService;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.AccreditationsApi;
import com.bfg.platform.gen.model.AccreditationBatchRenewalRequest;
import com.bfg.platform.gen.model.AccreditationBatchRenewalResponse;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationStatusPatchRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetAllAccreditations200Response;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
        var response = PageConverter.toResponse(page, GetAllAccreditations200Response.class);
        return ResponseEntity.ok(response);
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
    public ResponseEntity<AthleteDto> createAthleteWithAccreditation(AthleteCreateRequest request) {
        return accreditationService.createAthleteWithAccreditation(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new RuntimeException("Failed to create athlete with accreditation"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('CLUB_ADMIN', 'COACH')")
    public ResponseEntity<AccreditationBatchRenewalResponse> batchRenewAccreditations(
            AccreditationBatchRenewalRequest request) {
        AccreditationBatchRenewalResponse response = 
                accreditationService.batchRenewAccreditations(request);
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteBatchMigrationResponse> batchMigrateAthletes(AthleteBatchMigrationRequest request) {
        AthleteBatchMigrationResponse response = accreditationService.batchMigrateAthletes(request);
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AccreditationDto> patchAccreditationStatus(
            UUID accreditationUuid,
            AccreditationStatusPatchRequest body) {
        return accreditationService.updateAccreditationStatus(accreditationUuid, body.getStatus())
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Accreditation", accreditationUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteAccreditation(UUID accreditationUuid) {
        accreditationService.deleteAccreditation(accreditationUuid);
        return ResponseEntity.noContent().build();
    }
}

