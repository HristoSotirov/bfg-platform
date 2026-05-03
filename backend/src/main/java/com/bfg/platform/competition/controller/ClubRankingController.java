package com.bfg.platform.competition.controller;

import com.bfg.platform.competition.service.ClubRankingService;
import com.bfg.platform.gen.api.ClubRankingsApi;
import com.bfg.platform.gen.model.ClubRankingsRequest;
import com.bfg.platform.gen.model.ClubRankingsResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class ClubRankingController implements ClubRankingsApi {

    private final ClubRankingService service;

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<ClubRankingsResponse> computeClubRankings(ClubRankingsRequest request) {
        ClubRankingsResponse response = service.computeClubRankings(request.getCompetitionIds());
        return ResponseEntity.ok(response);
    }
}
