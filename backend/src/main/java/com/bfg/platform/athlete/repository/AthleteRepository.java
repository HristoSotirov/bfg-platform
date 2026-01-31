package com.bfg.platform.athlete.repository;

import com.bfg.platform.athlete.entity.Athlete;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AthleteRepository extends JpaRepository<Athlete, UUID>, JpaSpecificationExecutor<Athlete> {

    @Override
    Page<Athlete> findAll(Specification<Athlete> spec, Pageable pageable);

    @Override
    Optional<Athlete> findById(UUID id);

    Optional<Athlete> findByFirstNameAndMiddleNameAndLastNameAndDateOfBirth(
            String firstName, String middleName, String lastName, java.time.LocalDate dateOfBirth
    );
}

