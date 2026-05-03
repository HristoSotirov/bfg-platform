package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.CompetitionFinalStandingDto;
import com.bfg.platform.gen.model.DisciplineStandingResult;

import java.util.List;
import java.util.UUID;

public interface CompetitionFinalStandingService {

    List<DisciplineStandingResult> computeStandings(UUID competitionId, List<UUID> disciplineIds);

    List<CompetitionFinalStandingDto> getStandings(UUID competitionId, UUID disciplineId);

    void deleteStandings(UUID competitionId, List<UUID> disciplineIds);
}
