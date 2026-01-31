package com.bfg.platform.athlete.controller;

import com.bfg.platform.athlete.service.AthletePhotoService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.AthletePhotosApi;
import com.bfg.platform.gen.model.AthletePhotoDto;
import com.bfg.platform.gen.model.AthletePhotoListResponse;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class AthletePhotoController implements AthletePhotosApi {

    private final AthletePhotoService athletePhotoService;

    @Override
    public ResponseEntity<AthletePhotoListResponse> getAthletePhotos(@NotNull(message = "{athlete.uuid.required}") UUID athleteUuid, String filter, String orderBy, Integer top, Integer skip) {
        var result = athletePhotoService.getPhotoHistory(athleteUuid, filter, orderBy, top, skip);
        AthletePhotoListResponse response = new AthletePhotoListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent());
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<AthletePhotoDto> uploadAthletePhoto(@NotNull(message = "{athlete.uuid.required}") UUID athleteUuid, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new com.bfg.platform.common.exception.ValidationException("File is required");
        }
        return athletePhotoService.uploadPhoto(athleteUuid, file)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to upload photo"));
    }
}

