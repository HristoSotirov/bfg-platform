package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.DisciplineDefinitionService;
import com.bfg.platform.gen.api.DisciplineDefinitionsApi;
import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;
import com.bfg.platform.gen.model.GetAllDisciplineDefinitions200Response;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class DisciplineDefinitionController implements DisciplineDefinitionsApi {

    private final DisciplineDefinitionService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<GetAllDisciplineDefinitions200Response> getAllDisciplineDefinitions(
            String filter, String search, List<String> orderBy,
            Integer top, Integer skip, List<String> expand) {
        var page = service.getAll(filter, search, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllDisciplineDefinitions200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<DisciplineDefinitionDto> createDisciplineDefinition(
            DisciplineDefinitionRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create discipline definition"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<DisciplineDefinitionDto> getDisciplineDefinitionByUuid(UUID uuid, List<String> expand) {
        return service.getByUuid(uuid, expand)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Discipline definition", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<DisciplineDefinitionDto> updateDisciplineDefinitionByUuid(
            UUID uuid, DisciplineDefinitionRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Discipline definition", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteDisciplineDefinitionByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
