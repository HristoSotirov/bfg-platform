package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.AdvanceProgressionRequest;
import com.bfg.platform.gen.model.AdvanceProgressionResponse;
import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionParticipationDto;
import com.bfg.platform.gen.model.ParticipationResultRequest;
import com.bfg.platform.gen.model.ParticipationStatus;
import com.bfg.platform.gen.model.ProgressionDataDto;
import com.bfg.platform.gen.model.SetLanesRequest;

import java.util.List;
import java.util.UUID;

public interface CompetitionProgressionService {

    AdvanceProgressionResponse advanceProgression(UUID competitionId, AdvanceProgressionRequest request);

    ProgressionDataDto setLanes(UUID competitionId, SetLanesRequest request);

    ProgressionDataDto recordResults(UUID eventId, List<ParticipationResultRequest> results, CompetitionEventStatus eventStatus);

    ProgressionDataDto getProgressionData(UUID competitionId);

    ProgressionDataDto getEventParticipations(UUID eventId);

    CompetitionParticipationDto updateParticipationStatus(UUID participationUuid, ParticipationStatus newStatus);
}
