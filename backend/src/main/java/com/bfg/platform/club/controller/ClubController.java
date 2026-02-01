package com.bfg.platform.club.controller;

import com.bfg.platform.club.service.ClubService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.ClubsApi;
import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetAllClubs200Response;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class ClubController implements ClubsApi {

    private final ClubService clubService;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllClubs200Response> getAllClubs(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        var page = clubService.getAllClubs(filter, search, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllClubs200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByAdminId(UUID adminId, List<String> expand) {
        return clubService.getClubByAdminId(adminId, expand)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<ClubDto> getClubByUuid(
            UUID clubUuid,
            List<String> expand
    ) {
        return clubService.getClubDtoByUuid(clubUuid, expand)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

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

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubDto> patchClubByUuid(UUID clubUuid, @Valid @RequestBody ClubUpdateRequest clubUpdateRequest) {
        return clubService.updateClub(clubUuid, clubUpdateRequest)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<ClubDto> patchClubLogoByUuid(UUID clubUuid, MultipartFile file) {
        return clubService.updateClubLogo(clubUuid, file)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteClubByUuid(UUID clubUuid) {
        clubService.deleteClub(clubUuid);
        return ResponseEntity.noContent().build();
    }
}

