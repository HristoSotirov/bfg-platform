package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.QualificationRuleRequest;
import com.bfg.platform.gen.model.QualificationRuleDto;
import com.bfg.platform.gen.model.QualificationRuleRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QualificationRuleService {
    Page<QualificationRuleDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<QualificationRuleDto> getByUuid(UUID uuid);
    Optional<QualificationRuleDto> create(QualificationRuleRequest request);
    Optional<QualificationRuleDto> update(UUID uuid, QualificationRuleRequest request);
    void delete(UUID uuid);
}
