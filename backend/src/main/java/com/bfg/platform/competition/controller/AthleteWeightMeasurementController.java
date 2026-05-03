package com.bfg.platform.competition.controller;

import com.bfg.platform.competition.service.AthleteWeightMeasurementService;
import com.bfg.platform.gen.api.WeightMeasurementsApi;
import com.bfg.platform.gen.model.AthleteWeightMeasurementDto;
import com.bfg.platform.gen.model.RecordWeightRequest;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class AthleteWeightMeasurementController implements WeightMeasurementsApi {

    private final AthleteWeightMeasurementService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE')")
    public ResponseEntity<List<AthleteWeightMeasurementDto>> getWeightMeasurements(UUID uuid, LocalDate date) {
        return ResponseEntity.ok(service.getMeasurements(uuid, date));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<AthleteWeightMeasurementDto> recordWeight(UUID uuid, RecordWeightRequest request) {
        return ResponseEntity.ok(service.recordWeight(uuid, request));
    }
}
