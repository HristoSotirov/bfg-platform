package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateCreateRequest;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateDto;
import com.bfg.platform.gen.model.CompetitionEventTimetableTemplateUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionEventTimetableTemplateService {
    Page<CompetitionEventTimetableTemplateDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip);
    Optional<CompetitionEventTimetableTemplateDto> getByUuid(UUID uuid);
    Optional<CompetitionEventTimetableTemplateDto> create(CompetitionEventTimetableTemplateCreateRequest request);
    Optional<CompetitionEventTimetableTemplateDto> update(UUID uuid, CompetitionEventTimetableTemplateUpdateRequest request);
    void delete(UUID uuid);
}
