package com.bfg.platform.club.controller;

import com.bfg.platform.club.service.ClubCoachService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.ClubCoachesApi;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachListResponse;
import com.bfg.platform.gen.model.ClubDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class ClubCoachController implements ClubCoachesApi {

    private final ClubCoachService clubCoachService;

    // GET methods (Read)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubCoachListResponse> getClubCoaches(@NotNull(message = "{club.uuid.required}") UUID clubUuid, String filter, String orderBy, Integer top, Integer skip) {
        var result = clubCoachService.getCoachesByClubId(clubUuid, filter, orderBy, top, skip);
        ClubCoachListResponse response = new ClubCoachListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent());
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByCoachId(@NotNull(message = "{coach.uuid.required}") UUID coachId) {
        return clubCoachService.getClubByCoachId(coachId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    // POST methods (Create)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<ClubCoachDto> assignCoachToClub(@Valid ClubCoachCreateRequest clubCoachCreateRequest) {
        return clubCoachService.assignCoachToClub(clubCoachCreateRequest)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to assign coach to club"));
    }

    // DELETE methods
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<Void> removeCoachFromClub(@NotNull(message = "{clubCoach.uuid.required}") UUID clubCoachId) {
        clubCoachService.removeCoachFromClub(clubCoachId);
        return ResponseEntity.noContent().build();
    }
}

