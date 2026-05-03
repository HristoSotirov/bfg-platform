package com.bfg.platform.competition.controller;

import com.bfg.platform.competition.service.CompetitionProgressionService;
import com.bfg.platform.gen.api.ProgressionApi;
import com.bfg.platform.gen.model.AdvanceProgressionRequest;
import com.bfg.platform.gen.model.AdvanceProgressionResponse;
import com.bfg.platform.gen.model.CompetitionParticipationDto;
import com.bfg.platform.gen.model.ProgressionDataDto;
import com.bfg.platform.gen.model.RecordResultsRequest;
import com.bfg.platform.gen.model.SetLanesRequest;
import com.bfg.platform.gen.model.UpdateParticipationStatusRequest;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class CompetitionProgressionController implements ProgressionApi {

    private final CompetitionProgressionService progressionService;

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<AdvanceProgressionResponse> advanceProgression(
            UUID uuid, AdvanceProgressionRequest advanceProgressionRequest) {
        AdvanceProgressionResponse response = progressionService.advanceProgression(uuid, advanceProgressionRequest);
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<ProgressionDataDto> setLanes(UUID uuid, SetLanesRequest setLanesRequest) {
        ProgressionDataDto result = progressionService.setLanes(uuid, setLanesRequest);
        return ResponseEntity.ok(result);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<ProgressionDataDto> recordResults(
            UUID uuid, UUID eventUuid, RecordResultsRequest request) {
        ProgressionDataDto result = progressionService.recordResults(eventUuid, request.getResults(), request.getEventStatus());
        return ResponseEntity.ok(result);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<ProgressionDataDto> getProgressionData(UUID uuid) {
        return ResponseEntity.ok(progressionService.getProgressionData(uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<ProgressionDataDto> getEventParticipations(UUID uuid, UUID eventUuid) {
        return ResponseEntity.ok(progressionService.getEventParticipations(eventUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('APP_ADMIN', 'FEDERATION_ADMIN')")
    public ResponseEntity<CompetitionParticipationDto> updateParticipationStatus(
            UUID uuid, UUID participationUuid, UpdateParticipationStatusRequest request) {
        CompetitionParticipationDto result = progressionService.updateParticipationStatus(
                participationUuid, request.getParticipationStatus());
        return ResponseEntity.ok(result);
    }
}
