package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.ClubRankingsResponse;

import java.util.List;
import java.util.UUID;

public interface ClubRankingService {

    ClubRankingsResponse computeClubRankings(List<UUID> competitionIds);
}
