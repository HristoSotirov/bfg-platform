package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionGroupDefinitionDto;
import com.bfg.platform.gen.model.CompetitionGroupDefinitionRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionGroupDefinitionService {
    Page<CompetitionGroupDefinitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<CompetitionGroupDefinitionDto> getByUuid(UUID uuid);
    Optional<CompetitionGroupDefinitionDto> create(CompetitionGroupDefinitionRequest request);
    Optional<CompetitionGroupDefinitionDto> update(UUID uuid, CompetitionGroupDefinitionRequest request);
    void delete(UUID uuid);
}
