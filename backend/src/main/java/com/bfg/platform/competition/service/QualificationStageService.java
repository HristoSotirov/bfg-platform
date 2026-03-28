package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.QualificationStageRequest;
import com.bfg.platform.gen.model.QualificationStageDto;
import com.bfg.platform.gen.model.QualificationStageRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QualificationStageService {
    Page<QualificationStageDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<QualificationStageDto> getByUuid(UUID uuid);
    Optional<QualificationStageDto> create(QualificationStageRequest request);
    Optional<QualificationStageDto> update(UUID uuid, QualificationStageRequest request);
    void delete(UUID uuid);
}
