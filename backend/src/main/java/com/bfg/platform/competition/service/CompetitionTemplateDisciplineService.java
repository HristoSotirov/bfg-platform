package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionTemplateDisciplineCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDisciplineDto;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionTemplateDisciplineService {
    Page<CompetitionTemplateDisciplineDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip);
    Optional<CompetitionTemplateDisciplineDto> getByUuid(UUID uuid);
    Optional<CompetitionTemplateDisciplineDto> create(CompetitionTemplateDisciplineCreateRequest request);
    void delete(UUID uuid);
}
