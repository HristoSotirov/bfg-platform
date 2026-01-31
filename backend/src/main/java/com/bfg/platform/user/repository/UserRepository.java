package com.bfg.platform.user.repository;

import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    @Override
    Page<User> findAll(Specification<User> spec, Pageable pageable);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByIdAndRole(UUID id, String role);

    List<User> findByRole(String role);

    default boolean isAppAdmin(UUID id) {
        return existsByIdAndRole(id, SystemRole.APP_ADMIN.getValue());
    }

    default boolean isFederationAdmin(UUID id) {
        return existsByIdAndRole(id, SystemRole.FEDERATION_ADMIN.getValue());
    }

    default boolean isClubAdmin(UUID id) {
        return existsByIdAndRole(id, SystemRole.CLUB_ADMIN.getValue());
    }

    default boolean isCoach(UUID id) {
        return existsByIdAndRole(id, SystemRole.COACH.getValue());
    }
}

