package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.ScoringSchemeDto;
import com.bfg.platform.gen.model.ScoringSchemeRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScoringSchemeService {
    Page<ScoringSchemeDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<ScoringSchemeDto> getByUuid(UUID uuid);
    Optional<ScoringSchemeDto> create(ScoringSchemeRequest request);
    Optional<ScoringSchemeDto> update(UUID uuid, ScoringSchemeRequest request);
    void delete(UUID uuid);
}
