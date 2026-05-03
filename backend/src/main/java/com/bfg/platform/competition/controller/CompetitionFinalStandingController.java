package com.bfg.platform.competition.controller;

import com.bfg.platform.competition.service.CompetitionFinalStandingService;
import com.bfg.platform.gen.api.FinalStandingsApi;
import com.bfg.platform.gen.model.ComputeStandingsRequest;
import com.bfg.platform.gen.model.ComputeStandingsResponse;
import com.bfg.platform.gen.model.DeleteStandingsRequest;
import com.bfg.platform.gen.model.FinalStandingsDto;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class CompetitionFinalStandingController implements FinalStandingsApi {

    private final CompetitionFinalStandingService service;

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<ComputeStandingsResponse> computeFinalStandings(UUID uuid, ComputeStandingsRequest request) {
        var results = service.computeStandings(uuid, request.getDisciplineIds());
        ComputeStandingsResponse response = new ComputeStandingsResponse();
        response.setResults(results);
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<FinalStandingsDto> getFinalStandings(UUID uuid, UUID disciplineId) {
        var standings = service.getStandings(uuid, disciplineId);
        FinalStandingsDto dto = new FinalStandingsDto();
        dto.setStandings(standings);
        return ResponseEntity.ok(dto);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<Void> deleteFinalStandings(UUID uuid, DeleteStandingsRequest request) {
        service.deleteStandings(uuid, request.getDisciplineIds());
        return ResponseEntity.noContent().build();
    }
}
