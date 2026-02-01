package com.bfg.platform.athlete.service;

import com.bfg.platform.gen.model.AthletePhotoDto;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AthletePhotoService {
    Optional<AthletePhotoDto> uploadPhoto(UUID athleteId, MultipartFile file);
    Page<AthletePhotoDto> getPhotoHistory(
            UUID athleteId,
            String filter,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    );
}

