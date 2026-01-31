package com.bfg.platform.athlete.repository;

import com.bfg.platform.athlete.entity.AthletePhotoHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AthletePhotoHistoryRepository extends JpaRepository<AthletePhotoHistory, UUID>, JpaSpecificationExecutor<AthletePhotoHistory> {

    @EntityGraph(attributePaths = {"uploadedByClub"})
    Page<AthletePhotoHistory> findAll(org.springframework.data.jpa.domain.Specification<AthletePhotoHistory> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"uploadedByClub"})
    List<AthletePhotoHistory> findByAthleteId(UUID athleteId);
    
    @EntityGraph(attributePaths = {"uploadedByClub"})
    Optional<AthletePhotoHistory> findWithRelationsById(UUID id);
}

