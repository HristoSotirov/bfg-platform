package com.bfg.platform.athlete.repository;

import com.bfg.platform.athlete.entity.Accreditation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccreditationRepository extends JpaRepository<Accreditation, UUID>, JpaSpecificationExecutor<Accreditation> {

    @Override
    Page<Accreditation> findAll(Specification<Accreditation> spec, Pageable pageable);

    Optional<Accreditation> findWithRelationsById(UUID id);

    List<Accreditation> findByAthleteId(UUID athleteId);
    List<Accreditation> findByClubId(UUID clubId);
    List<Accreditation> findByYear(Integer year);
    boolean existsByAthleteIdAndClubIdAndYear(UUID athleteId, UUID clubId, Integer year);
    boolean existsByClubId(UUID clubId);

    @EntityGraph(attributePaths = {"club"})
    Optional<Accreditation> findFirstByAthleteIdOrderByYearDescCreatedAtDesc(UUID athleteId);
    
    @EntityGraph(attributePaths = {"club"})
    Optional<Accreditation> findFirstByAthleteIdAndClubIdOrderByYearDescCreatedAtDesc(UUID athleteId, UUID clubId);
    
    @EntityGraph(attributePaths = {"club"})
    Optional<Accreditation> findFirstByAthleteIdAndYearOrderByCreatedAtDesc(UUID athleteId, Integer year);
    
    @EntityGraph(attributePaths = {"club"})
    Optional<Accreditation> findFirstByAthleteIdAndClubIdAndYearOrderByCreatedAtDesc(UUID athleteId, UUID clubId, Integer year);
    
    boolean existsByAthleteId(UUID athleteId);
    
    @Query(value = """
        SELECT MAX(CAST(SUBSTRING(accreditation_number, 4) AS INTEGER))
        FROM accreditations
        WHERE club_id = :clubId AND accreditation_number LIKE :prefixPattern
        """, nativeQuery = true)
    Optional<Integer> findMaxAthleteNumberForClub(@Param("clubId") UUID clubId, @Param("prefixPattern") String prefixPattern);
    
    @Query(value = """
        SELECT LPAD(CAST(COALESCE(MAX(CAST(RIGHT(accreditation_number, 4) AS INTEGER)), 0) + 1 AS TEXT), 4, '0')
        FROM accreditations
        WHERE club_id = :clubId AND accreditation_number LIKE :prefixPattern
        """, nativeQuery = true)
    String findNextAthleteNumberForClub(@Param("clubId") UUID clubId, @Param("prefixPattern") String prefixPattern);
    
    @Query(value = """
        SELECT accreditation_number
        FROM accreditations
        WHERE athlete_id = :athleteId AND club_id = :clubId
        ORDER BY year DESC, created_at DESC
        LIMIT 1
        """, nativeQuery = true)
    Optional<String> findExistingCardNumberForAthleteAndClub(@Param("athleteId") UUID athleteId, @Param("clubId") UUID clubId);
}

