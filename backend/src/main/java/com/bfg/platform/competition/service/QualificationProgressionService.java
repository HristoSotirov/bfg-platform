package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.QualificationProgressionDto;
import com.bfg.platform.gen.model.QualificationProgressionRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QualificationProgressionService {
    Page<QualificationProgressionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<QualificationProgressionDto> getByUuid(UUID uuid);
    Optional<QualificationProgressionDto> create(QualificationProgressionRequest request);
    Optional<QualificationProgressionDto> update(UUID uuid, QualificationProgressionRequest request);
    void delete(UUID uuid);
}
