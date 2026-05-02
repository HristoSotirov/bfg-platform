package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.AthleteWeightMeasurementDto;
import com.bfg.platform.gen.model.RecordWeightRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AthleteWeightMeasurementService {

    AthleteWeightMeasurementDto recordWeight(UUID competitionUuid, RecordWeightRequest request);

    List<AthleteWeightMeasurementDto> getMeasurements(UUID competitionUuid, LocalDate date);
}
