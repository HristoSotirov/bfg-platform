package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.QualificationTierService;
import com.bfg.platform.gen.api.QualificationTiersApi;
import com.bfg.platform.gen.model.GetAllQualificationTiers200Response;
import com.bfg.platform.gen.model.QualificationTierDto;
import com.bfg.platform.gen.model.QualificationTierRequest;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class QualificationTierController implements QualificationTiersApi {

    private final QualificationTierService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<GetAllQualificationTiers200Response> getAllQualificationTiers(
            String filter, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, null, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllQualificationTiers200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationTierDto> createQualificationTier(
            QualificationTierRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create qualification tier"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<QualificationTierDto> getQualificationTierByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification tier", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationTierDto> updateQualificationTierByUuid(
            UUID uuid, QualificationTierRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification tier", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteQualificationTierByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
