package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.CompetitionEventTimetableTemplateService;
import com.bfg.platform.gen.api.CompetitionEventTimetableTemplatesApi;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateDto;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateUpdateRequest;
import com.bfg.platform.gen.model.GetAllCompetitionEventTimetableTemplates200Response;
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
public class CompetitionEventTimetableTemplateController implements CompetitionEventTimetableTemplatesApi {

    private final CompetitionEventTimetableTemplateService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllCompetitionEventTimetableTemplates200Response> getAllCompetitionEventTimetableTemplates(
            String filter, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllCompetitionEventTimetableTemplates200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionEventTimetableTemplateDto> createCompetitionEventTimetableTemplate(
            @Valid @RequestBody CompetitionEventTimetableTemplateCreateRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create competition event timetable template"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<CompetitionEventTimetableTemplateDto> getCompetitionEventTimetableTemplateByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition event timetable template", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionEventTimetableTemplateDto> patchCompetitionEventTimetableTemplateByUuid(
            UUID uuid, @Valid @RequestBody CompetitionEventTimetableTemplateUpdateRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition event timetable template", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteCompetitionEventTimetableTemplateByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
