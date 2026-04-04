package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.CompetitionDisciplineSchemeService;
import com.bfg.platform.gen.api.CompetitionDisciplineSchemesApi;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;
import com.bfg.platform.gen.model.GetAllCompetitionDisciplineSchemes200Response;
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
public class CompetitionDisciplineSchemeController implements CompetitionDisciplineSchemesApi {

    private final CompetitionDisciplineSchemeService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllCompetitionDisciplineSchemes200Response> getAllCompetitionDisciplineSchemes(
            String filter, Integer top, Integer skip, List<String> orderBy, List<String> expand) {
        var page = service.getAll(filter, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllCompetitionDisciplineSchemes200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionDisciplineSchemeDto> createCompetitionDisciplineScheme(
            @Valid @RequestBody CompetitionDisciplineSchemeRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create competition discipline scheme"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<CompetitionDisciplineSchemeDto> getCompetitionDisciplineSchemeByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition discipline scheme", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionDisciplineSchemeDto> updateCompetitionDisciplineSchemeByUuid(
            UUID uuid, @Valid @RequestBody CompetitionDisciplineSchemeRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition discipline scheme", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteCompetitionDisciplineSchemeByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
