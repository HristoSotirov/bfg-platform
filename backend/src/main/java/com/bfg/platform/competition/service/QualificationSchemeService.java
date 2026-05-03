package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.QualificationSchemeDto;
import com.bfg.platform.gen.model.QualificationSchemeRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QualificationSchemeService {
    Page<QualificationSchemeDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<QualificationSchemeDto> getByUuid(UUID uuid);
    Optional<QualificationSchemeDto> create(QualificationSchemeRequest request);
    Optional<QualificationSchemeDto> update(UUID uuid, QualificationSchemeRequest request);
    void delete(UUID uuid);
}
