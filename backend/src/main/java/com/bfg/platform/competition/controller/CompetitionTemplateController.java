package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.CompetitionTemplateService;
import com.bfg.platform.gen.api.CompetitionTemplatesApi;
import com.bfg.platform.gen.model.CompetitionTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDto;
import com.bfg.platform.gen.model.CompetitionTemplateUpdateRequest;
import com.bfg.platform.gen.model.GetAllCompetitionTemplates200Response;
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
public class CompetitionTemplateController implements CompetitionTemplatesApi {

    private final CompetitionTemplateService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllCompetitionTemplates200Response> getAllCompetitionTemplates(
            String filter, String search, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, search, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllCompetitionTemplates200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionTemplateDto> createCompetitionTemplate(
            @Valid @RequestBody CompetitionTemplateCreateRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create competition template"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<CompetitionTemplateDto> getCompetitionTemplateByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition template", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionTemplateDto> patchCompetitionTemplateByUuid(
            UUID uuid, @Valid @RequestBody CompetitionTemplateUpdateRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition template", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteCompetitionTemplateByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
