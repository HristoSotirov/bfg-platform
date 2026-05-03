package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.QualificationTierDto;
import com.bfg.platform.gen.model.QualificationTierRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QualificationTierService {
    Page<QualificationTierDto> getAll(String filter, String search, List<String> orderBy, Integer top, Integer skip);
    Optional<QualificationTierDto> getByUuid(UUID uuid);
    Optional<QualificationTierDto> create(QualificationTierRequest request);
    Optional<QualificationTierDto> update(UUID uuid, QualificationTierRequest request);
    void delete(UUID uuid);
}
