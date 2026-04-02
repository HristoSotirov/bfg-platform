package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.CompetitionTimetableEventService;
import com.bfg.platform.gen.api.CompetitionTimetableEventsApi;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;
import com.bfg.platform.gen.model.GetAllCompetitionTimetableEvents200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class CompetitionTimetableEventController implements CompetitionTimetableEventsApi {

    private final CompetitionTimetableEventService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllCompetitionTimetableEvents200Response> getAllCompetitionTimetableEvents(
            String filter, List<String> orderBy, Integer top, Integer skip) {
        var page = service.getAll(filter, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllCompetitionTimetableEvents200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionTimetableEventDto> createCompetitionTimetableEvent(
            @Valid @RequestBody CompetitionTimetableEventRequest request) {
        return service.create(request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", (UUID) null));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<CompetitionTimetableEventDto> getCompetitionTimetableEventByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<CompetitionTimetableEventDto> updateCompetitionTimetableEventByUuid(
            UUID uuid, @Valid @RequestBody CompetitionTimetableEventRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteCompetitionTimetableEventByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
