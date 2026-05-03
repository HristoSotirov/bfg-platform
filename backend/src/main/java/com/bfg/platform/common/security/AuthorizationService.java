package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;

import java.util.Optional;
import java.util.UUID;

public interface AuthorizationService {
    void requireCanModifyClub(UUID clubId);
    void requireCanManageClubCoaches(UUID clubId);
    void requireCanManageAccreditations(UUID clubId);
    UUID requireCurrentUserClubId();
    Optional<UUID> findCurrentUserClubId();
    ScopeType getCurrentUserClubType();
}
