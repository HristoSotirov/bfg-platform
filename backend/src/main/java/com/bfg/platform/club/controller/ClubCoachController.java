package com.bfg.platform.club.controller;

import com.bfg.platform.club.service.ClubCoachService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.gen.api.ClubCoachesApi;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetClubCoaches200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class ClubCoachController implements ClubCoachesApi {

    private final ClubCoachService clubCoachService;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetClubCoaches200Response> getClubCoaches(UUID clubUuid, String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        var page = clubCoachService.getCoachesByClubId(clubUuid, filter, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetClubCoaches200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByCoachId(UUID coachId, List<String> expand) {
        return clubCoachService.getClubByCoachId(coachId, expand)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<ClubCoachDto> assignCoachToClub(@Valid ClubCoachCreateRequest clubCoachCreateRequest) {
        return clubCoachService.assignCoachToClub(clubCoachCreateRequest)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to assign coach to club"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<Void> removeCoachFromClub(UUID clubCoachId) {
        clubCoachService.removeCoachFromClub(clubCoachId);
        return ResponseEntity.noContent().build();
    }
}

