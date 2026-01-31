package com.bfg.platform.athlete.service;

import org.springframework.web.multipart.MultipartFile;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.AthletePhotoFacets;

import java.util.Optional;
import java.util.UUID;

public interface AthletePhotoService {
    Optional<com.bfg.platform.gen.model.AthletePhotoDto> uploadPhoto(UUID athleteId, MultipartFile file);
    ListResult<com.bfg.platform.gen.model.AthletePhotoDto, AthletePhotoFacets> getPhotoHistory(
            UUID athleteId,
            String filter,
            String orderBy,
            Integer top,
            Integer skip
    );
}

