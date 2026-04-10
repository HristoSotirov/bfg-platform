package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CompetitionRepository extends JpaRepository<Competition, UUID>, JpaSpecificationExecutor<Competition> {
}
