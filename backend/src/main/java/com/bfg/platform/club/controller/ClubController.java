package com.bfg.platform.club.controller;

import com.bfg.platform.club.service.ClubService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.ClubsApi;
import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubListResponse;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class ClubController implements ClubsApi {

    private final ClubService clubService;

    // GET methods (Read)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubListResponse> getAllClubs(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        var result = clubService.getAllClubs(filter, search, orderBy, top, skip);
        return ResponseEntity.ok(new ClubListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent()));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByAdminId(@NotNull(message = "{user.uuid.required}") UUID adminId) {
        return clubService.getClubByAdminId(adminId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByUuid(@NotNull(message = "{club.uuid.required}") UUID clubUuid) {
        return clubService.getClubDtoByUuid(clubUuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

    // POST methods (Create)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubDto> createClub(@Valid @RequestBody ClubCreateRequest clubCreateRequest) {
        return clubService.createClub(clubCreateRequest)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create club"));
    }

    @PostMapping("/clubs/migrate")
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubBatchCreateResponse> migrateClubs(@Valid @RequestBody ClubBatchCreateRequest clubBatchCreateRequest) {
        ClubBatchCreateResponse response = clubService.migrateClubs(clubBatchCreateRequest);
        return ResponseEntity.ok(response);
    }

    // PATCH methods (Update)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubDto> patchClubByUuid(@NotNull(message = "{club.uuid.required}") UUID clubUuid, @Valid @RequestBody ClubUpdateRequest clubUpdateRequest) {
        return clubService.updateClub(clubUuid, clubUpdateRequest)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubDto> patchClubLogoByUuid(@NotNull(message = "{club.uuid.required}") UUID clubUuid, MultipartFile file) {
        return clubService.updateClubLogo(clubUuid, file)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

    // DELETE methods
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteClubByUuid(@NotNull(message = "{club.uuid.required}") UUID clubUuid) {
        clubService.deleteClub(clubUuid);
        return ResponseEntity.noContent().build();
    }
}

