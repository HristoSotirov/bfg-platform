package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.QualificationSchemeService;
import com.bfg.platform.gen.api.QualificationSchemesApi;
import com.bfg.platform.gen.model.GetAllQualificationSchemes200Response;
import com.bfg.platform.gen.model.QualificationSchemeDto;
import com.bfg.platform.gen.model.QualificationSchemeRequest;
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
public class QualificationSchemeController implements QualificationSchemesApi {

    private final QualificationSchemeService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllQualificationSchemes200Response> getAllQualificationSchemes(
            String filter, String search, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, search, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllQualificationSchemes200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationSchemeDto> createQualificationScheme(
            @Valid @RequestBody QualificationSchemeRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create qualification scheme"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<QualificationSchemeDto> getQualificationSchemeByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification scheme", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationSchemeDto> updateQualificationSchemeByUuid(
            UUID uuid, @Valid @RequestBody QualificationSchemeRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification scheme", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteQualificationSchemeByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
