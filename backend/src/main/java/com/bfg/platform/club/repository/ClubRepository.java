package com.bfg.platform.club.repository;

import com.bfg.platform.club.entity.Club;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClubRepository extends JpaRepository<Club, UUID>, JpaSpecificationExecutor<Club> {

    @Override
    @EntityGraph(attributePaths = {"clubAdminUser"})
    @NonNull
    Page<Club> findAll(@NonNull Specification<Club> spec, @NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"clubAdminUser"})
    Optional<Club> findWithAdminById(@NonNull UUID id);

    Optional<Club> findByClubAdmin(@NonNull UUID clubAdmin);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
        SELECT LPAD(CAST(COALESCE(MAX(CAST(card_prefix AS INTEGER)), 0) + 1 AS TEXT), 2, '0')
        FROM clubs
        WHERE card_prefix ~ '^[0-9]{2}$'
        """, nativeQuery = true)
    String findNextCardPrefix();
    
    Optional<Club> findByCardPrefix(@NonNull String cardPrefix);
}

