package com.bfg.platform.common.security;

import com.bfg.platform.common.exception.UnauthorizedException;
import com.bfg.platform.gen.model.SystemRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Helper class to read and return logged user information from JWT token.
 *
 * Flow: JWT Token → JwtAuthenticationFilter → SecurityContextHolder → SecurityContextHelper
 */
@Component
public class SecurityContextHelperImpl implements SecurityContextHelper {
    @Override
    public Authentication getCurrentAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Override
    public UUID getUserId() {
        Authentication authentication = getCurrentAuthentication();
        if (authentication == null) {
            throw new UnauthorizedException("User is not authenticated");
        }
        if (!(authentication.getPrincipal() instanceof UUID)) {
            throw new UnauthorizedException("Invalid authentication principal");
        }
        return (UUID) authentication.getPrincipal();
    }

    @Override
    public SystemRole getUserRole() {
        Authentication authentication = getCurrentAuthentication();
        if (authentication == null) {
            throw new UnauthorizedException("User is not authenticated");
        }
        if (authentication.getAuthorities() == null || authentication.getAuthorities().isEmpty()) {
            throw new UnauthorizedException("User has no authorities");
        }
        String roleString = authentication.getAuthorities().iterator().next().getAuthority();
        try {
            return SystemRole.fromValue(roleString);
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("Invalid role: " + roleString);
        }
    }

    @Override
    public boolean isFederationAdmin() {
        return SystemRole.FEDERATION_ADMIN.equals(getUserRole());
    }

    @Override
    public boolean isAppAdmin() {
        return SystemRole.APP_ADMIN.equals(getUserRole());
    }

    @Override
    public boolean isClubAdmin() {
        return SystemRole.CLUB_ADMIN.equals(getUserRole());
    }

    @Override
    public boolean isCoach() {
        return SystemRole.COACH.equals(getUserRole());
    }
}

