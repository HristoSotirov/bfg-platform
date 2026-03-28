package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.ScoringRuleDto;
import com.bfg.platform.gen.model.ScoringRuleRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScoringRuleService {
    Page<ScoringRuleDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<ScoringRuleDto> getByUuid(UUID uuid);
    Optional<ScoringRuleDto> create(ScoringRuleRequest request);
    Optional<ScoringRuleDto> update(UUID uuid, ScoringRuleRequest request);
    void delete(UUID uuid);
}
