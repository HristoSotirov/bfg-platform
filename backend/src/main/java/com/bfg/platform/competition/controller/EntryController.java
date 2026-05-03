package com.bfg.platform.competition.controller;

import com.bfg.platform.competition.service.EntryService;
import com.bfg.platform.gen.api.EntriesApi;
import com.bfg.platform.gen.model.ClubEntriesDto;
import com.bfg.platform.gen.model.ClubEntriesRequest;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class EntryController implements EntriesApi {

    private final EntryService entryService;

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<ClubEntriesDto> getCompetitionEntries(
            UUID uuid, UUID clubId, List<String> expand) {
        return ResponseEntity.ok(entryService.getEntries(uuid, clubId, expand));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubEntriesDto> submitCompetitionEntries(
            UUID uuid, UUID clubId, ClubEntriesRequest clubEntriesRequest) {
        return ResponseEntity.ok(entryService.submitEntries(uuid, clubId, clubEntriesRequest));
    }
}
