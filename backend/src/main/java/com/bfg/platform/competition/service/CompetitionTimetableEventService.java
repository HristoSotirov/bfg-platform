package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionTimetableEventService {
    Page<CompetitionTimetableEventDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand);
    Optional<CompetitionTimetableEventDto> getByUuid(UUID uuid);
    Optional<CompetitionTimetableEventDto> create(CompetitionTimetableEventRequest request);
    Optional<CompetitionTimetableEventDto> update(UUID uuid, CompetitionTimetableEventRequest request);
    void delete(UUID uuid);
    CompetitionTimetableEventDto updateEventStatus(UUID uuid, CompetitionEventStatus newStatus);
}
