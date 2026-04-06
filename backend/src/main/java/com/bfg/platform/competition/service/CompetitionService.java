package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionCreateRequest;
import com.bfg.platform.gen.model.CompetitionDto;
import com.bfg.platform.gen.model.CompetitionUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionService {
    Page<CompetitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<CompetitionDto> getByUuid(UUID uuid);
    Optional<CompetitionDto> create(CompetitionCreateRequest request);
    Optional<CompetitionDto> update(UUID uuid, CompetitionUpdateRequest request);
    void delete(UUID uuid);
}
