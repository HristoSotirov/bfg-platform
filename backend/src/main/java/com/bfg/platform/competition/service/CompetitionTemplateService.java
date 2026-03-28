package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionTemplateDto;
import com.bfg.platform.gen.model.CompetitionTemplateUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionTemplateService {
    Page<CompetitionTemplateDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<CompetitionTemplateDto> getByUuid(UUID uuid);
    Optional<CompetitionTemplateDto> create(CompetitionTemplateCreateRequest request);
    Optional<CompetitionTemplateDto> update(UUID uuid, CompetitionTemplateUpdateRequest request);
    void delete(UUID uuid);
}
