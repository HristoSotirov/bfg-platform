package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.ScoringSchemeBoatCoefficientService;
import com.bfg.platform.gen.api.ScoringSchemeBoatCoefficientsApi;
import com.bfg.platform.gen.model.GetAllScoringSchemeBoatCoefficients200Response;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientDto;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientRequest;
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
public class ScoringSchemeBoatCoefficientController implements ScoringSchemeBoatCoefficientsApi {

    private final ScoringSchemeBoatCoefficientService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllScoringSchemeBoatCoefficients200Response> getAllScoringSchemeBoatCoefficients(
            String filter, Integer top, Integer skip) {
        var page = service.getAll(filter, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllScoringSchemeBoatCoefficients200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ScoringSchemeBoatCoefficientDto> createScoringSchemeBoatCoefficient(
            @Valid @RequestBody ScoringSchemeBoatCoefficientRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create scoring scheme boat coefficient"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ScoringSchemeBoatCoefficientDto> getScoringSchemeBoatCoefficientByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Scoring scheme boat coefficient", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ScoringSchemeBoatCoefficientDto> updateScoringSchemeBoatCoefficientByUuid(
            UUID uuid, @Valid @RequestBody ScoringSchemeBoatCoefficientRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Scoring scheme boat coefficient", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteScoringSchemeBoatCoefficientByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
