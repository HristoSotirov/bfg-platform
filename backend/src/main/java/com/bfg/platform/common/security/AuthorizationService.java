package com.bfg.platform.common.security;

import java.util.UUID;

public interface AuthorizationService {
    void requireCanModifyClub(UUID clubId);
    void requireCanManageClubCoaches(UUID clubId);
    void requireCanManageAccreditations(UUID clubId);
    UUID requireCurrentUserClubId();
}

