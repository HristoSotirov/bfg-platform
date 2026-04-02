package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionDisciplineSchemeDto;
import com.bfg.platform.gen.model.CompetitionDisciplineSchemeRequest;
import org.springframework.data.domain.Page;

import java.util.Optional;
import java.util.UUID;

public interface CompetitionDisciplineSchemeService {
    Page<CompetitionDisciplineSchemeDto> getAll(String filter, Integer top, Integer skip);
    Optional<CompetitionDisciplineSchemeDto> getByUuid(UUID uuid);
    Optional<CompetitionDisciplineSchemeDto> create(CompetitionDisciplineSchemeRequest request);
    Optional<CompetitionDisciplineSchemeDto> update(UUID uuid, CompetitionDisciplineSchemeRequest request);
    void delete(UUID uuid);
}
