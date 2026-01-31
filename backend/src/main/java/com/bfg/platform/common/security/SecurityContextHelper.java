package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.SystemRole;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public interface SecurityContextHelper {
    Authentication getCurrentAuthentication();
    UUID getUserId();
    SystemRole getUserRole();
    boolean isFederationAdmin();
    boolean isAppAdmin();
    boolean isClubAdmin();
    boolean isCoach();
}
