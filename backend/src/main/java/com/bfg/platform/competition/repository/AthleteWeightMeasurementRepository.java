package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.AthleteWeightMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AthleteWeightMeasurementRepository extends JpaRepository<AthleteWeightMeasurement, UUID> {

    Optional<AthleteWeightMeasurement> findByAthleteIdAndMeasurementDate(UUID athleteId, LocalDate measurementDate);

    List<AthleteWeightMeasurement> findByMeasurementDate(LocalDate measurementDate);

    List<AthleteWeightMeasurement> findByAthleteIdInAndMeasurementDate(List<UUID> athleteIds, LocalDate measurementDate);
}
