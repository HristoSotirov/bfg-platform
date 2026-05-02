package com.bfg.platform.competition.service;

import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.competition.entity.AthleteWeightMeasurement;
import com.bfg.platform.competition.mapper.AthleteWeightMeasurementMapper;
import com.bfg.platform.competition.repository.AthleteWeightMeasurementRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.gen.model.AthleteWeightMeasurementDto;
import com.bfg.platform.gen.model.RecordWeightRequest;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AthleteWeightMeasurementServiceImpl implements AthleteWeightMeasurementService {

    private final AthleteWeightMeasurementRepository repository;
    private final CompetitionRepository competitionRepository;

    @Override
    @Transactional
    public AthleteWeightMeasurementDto recordWeight(UUID competitionUuid, RecordWeightRequest request) {
        if (!competitionRepository.existsById(competitionUuid)) {
            throw new ResourceNotFoundException("Competition", competitionUuid);
        }

        LocalDate today = LocalDate.now();

        AthleteWeightMeasurement measurement = repository
                .findByAthleteIdAndMeasurementDate(request.getAthleteId(), today)
                .map(existing -> {
                    if (!today.equals(existing.getMeasurementDate())) {
                        throw new IllegalStateException("Не може да се редактира измерване от друг ден");
                    }
                    existing.setWeightKg(BigDecimal.valueOf(request.getWeightKg()));
                    existing.setRole(request.getRole());
                    return existing;
                })
                .orElseGet(() -> AthleteWeightMeasurement.builder()
                        .athleteId(request.getAthleteId())
                        .weightKg(BigDecimal.valueOf(request.getWeightKg()))
                        .role(request.getRole())
                        .build());

        AthleteWeightMeasurement saved = repository.save(measurement);
        return AthleteWeightMeasurementMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AthleteWeightMeasurementDto> getMeasurements(UUID competitionUuid, LocalDate date) {
        if (!competitionRepository.existsById(competitionUuid)) {
            throw new ResourceNotFoundException("Competition", competitionUuid);
        }

        LocalDate targetDate = date != null ? date : LocalDate.now();

        return repository.findByMeasurementDate(targetDate).stream()
                .map(AthleteWeightMeasurementMapper::toDto)
                .toList();
    }
}
