package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientDto;
import com.bfg.platform.gen.model.ScoringSchemeBoatCoefficientRequest;
import org.springframework.data.domain.Page;

import java.util.Optional;
import java.util.UUID;

public interface ScoringSchemeBoatCoefficientService {
    Page<ScoringSchemeBoatCoefficientDto> getAll(String filter, Integer top, Integer skip);
    Optional<ScoringSchemeBoatCoefficientDto> getByUuid(UUID uuid);
    Optional<ScoringSchemeBoatCoefficientDto> create(ScoringSchemeBoatCoefficientRequest request);
    Optional<ScoringSchemeBoatCoefficientDto> update(UUID uuid, ScoringSchemeBoatCoefficientRequest request);
    void delete(UUID uuid);
}
