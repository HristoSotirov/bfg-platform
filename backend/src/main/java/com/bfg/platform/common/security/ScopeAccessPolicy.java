package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

@Component
public class ScopeAccessPolicy {

    public Set<ScopeType> getAllowedScopes(SystemRole role, ScopeType clubType) {
        if (role == null) {
            return Set.of();
        }
        return switch (role) {
            case APP_ADMIN, FEDERATION_ADMIN ->
                Set.of(ScopeType.INTERNAL, ScopeType.EXTERNAL, ScopeType.NATIONAL);
            case CLUB_ADMIN, COACH ->
                clubType != null ? Set.of(clubType) : Set.of();
        };
    }

    public boolean requiresClubRestriction(SystemRole role, ScopeType clubType, ResourceType resourceType) {
        if (role == null) {
            return true;
        }
        if (role == SystemRole.APP_ADMIN || role == SystemRole.FEDERATION_ADMIN) {
            return false;
        }
        if (resourceType == ResourceType.ACCREDITATION || resourceType == ResourceType.ATHLETE) {
            return clubType != ScopeType.INTERNAL;
        }
        return false;
    }

    public boolean canAccessResource(SystemRole userRole, ScopeType clubType, UUID userClubId,
                                      ScopeType resourceScope, UUID resourceClubId,
                                      ResourceType resourceType) {
        Set<ScopeType> allowedScopes = getAllowedScopes(userRole, clubType);
        if (!allowedScopes.contains(resourceScope)) {
            return false;
        }

        if (requiresClubRestriction(userRole, clubType, resourceType)) {
            if (resourceClubId == null || userClubId == null) {
                return false;
            }
            return resourceClubId.equals(userClubId);
        }

        return true;
    }
}
