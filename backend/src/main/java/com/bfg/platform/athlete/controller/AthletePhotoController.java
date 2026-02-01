package com.bfg.platform.athlete.controller;

import com.bfg.platform.athlete.service.AthletePhotoService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.api.AthletePhotosApi;
import com.bfg.platform.gen.model.AthletePhotoDto;
import com.bfg.platform.gen.model.GetAthletePhotos200Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AthletePhotoController implements AthletePhotosApi {

    private final AthletePhotoService athletePhotoService;

    @Override
    public ResponseEntity<GetAthletePhotos200Response> getAthletePhotos(UUID athleteUuid, String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        var page = athletePhotoService.getPhotoHistory(athleteUuid, filter, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAthletePhotos200Response.class));
    }

    @Override
    public ResponseEntity<AthletePhotoDto> uploadAthletePhoto(UUID athleteUuid, MultipartFile file) {
        return athletePhotoService.uploadPhoto(athleteUuid, file)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to upload photo"));
    }
}

