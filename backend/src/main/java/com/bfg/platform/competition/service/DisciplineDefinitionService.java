package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.DisciplineDefinitionDto;
import com.bfg.platform.gen.model.DisciplineDefinitionRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DisciplineDefinitionService {
    Page<DisciplineDefinitionDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand);
    Optional<DisciplineDefinitionDto> getByUuid(UUID uuid, List<String> expand);
    Optional<DisciplineDefinitionDto> create(DisciplineDefinitionRequest request);
    Optional<DisciplineDefinitionDto> update(UUID uuid, DisciplineDefinitionRequest request);
    void delete(UUID uuid);
}
