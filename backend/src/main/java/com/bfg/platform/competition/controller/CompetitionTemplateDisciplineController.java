package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.CompetitionTemplateDisciplineService;
import com.bfg.platform.gen.api.CompetitionTemplateDisciplinesApi;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineDto;
import com.bfg.platform.gen.model.GetAllCompetitionTemplateDisciplines200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class CompetitionTemplateDisciplineController implements CompetitionTemplateDisciplinesApi {

    private final CompetitionTemplateDisciplineService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllCompetitionTemplateDisciplines200Response> getAllCompetitionTemplateDisciplines(
            String filter, Integer top, Integer skip) {
        var page = service.getAll(filter, null, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllCompetitionTemplateDisciplines200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionTemplateDisciplineDto> createCompetitionTemplateDiscipline(
            @Valid @RequestBody CompetitionTemplateDisciplineCreateRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create competition template discipline"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<CompetitionTemplateDisciplineDto> getCompetitionTemplateDisciplineByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition template discipline", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteCompetitionTemplateDisciplineByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
