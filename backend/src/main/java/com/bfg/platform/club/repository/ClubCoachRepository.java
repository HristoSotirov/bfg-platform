package com.bfg.platform.club.repository;

import com.bfg.platform.club.entity.ClubCoach;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClubCoachRepository extends JpaRepository<ClubCoach, UUID>, JpaSpecificationExecutor<ClubCoach> {

    @Override
    @EntityGraph(attributePaths = {"coach", "club"})
    @NonNull
    Page<ClubCoach> findAll(@NonNull Specification<ClubCoach> spec, @NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"coach", "club"})
    Optional<ClubCoach> findByCoachId(@NonNull UUID coachId);

    boolean existsByClubIdAndCoachId(@NonNull UUID clubId, @NonNull UUID coachId);
}

