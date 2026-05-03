package com.bfg.platform.club.repository;

import com.bfg.platform.club.entity.Club;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.bfg.platform.gen.model.ScopeType;

@Repository
public interface ClubRepository extends JpaRepository<Club, UUID>, JpaSpecificationExecutor<Club> {

    @Override
    @NonNull
    Page<Club> findAll(@NonNull Specification<Club> spec, @NonNull Pageable pageable);

    Optional<Club> findWithAdminById(@NonNull UUID id);

    Optional<Club> findByClubAdmin(@NonNull UUID clubAdmin);

    @Query("SELECT c.clubAdmin FROM Club c WHERE c.clubAdmin IS NOT NULL")
    List<UUID> findAllAssignedClubAdminIds();

    @Query(value = """
        SELECT LPAD(CAST(COALESCE(MAX(CAST(card_prefix AS INTEGER)), 0) + 1 AS TEXT), 2, '0')
        FROM clubs
        WHERE card_prefix ~ '^[0-9]{2}$' AND type = :type
        """, nativeQuery = true)
    String findNextCardPrefix(@Param("type") String type);

    Optional<Club> findByCardPrefix(@NonNull String cardPrefix);

    Optional<Club> findByCardPrefixAndType(@NonNull String cardPrefix, @NonNull ScopeType type);
}

