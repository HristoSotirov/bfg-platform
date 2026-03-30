package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.QualificationProgressionService;
import com.bfg.platform.gen.api.QualificationProgressionsApi;
import com.bfg.platform.gen.model.GetAllQualificationProgressions200Response;
import com.bfg.platform.gen.model.QualificationProgressionDto;
import com.bfg.platform.gen.model.QualificationProgressionRequest;
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
public class QualificationProgressionController implements QualificationProgressionsApi {

    private final QualificationProgressionService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllQualificationProgressions200Response> getAllQualificationProgressions(
            String filter, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, null, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllQualificationProgressions200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationProgressionDto> createQualificationProgression(
            @Valid @RequestBody QualificationProgressionRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create qualification progression"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<QualificationProgressionDto> getQualificationProgressionByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification progression", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationProgressionDto> updateQualificationProgressionByUuid(
            UUID uuid, @Valid @RequestBody QualificationProgressionRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification progression", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteQualificationProgressionByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
