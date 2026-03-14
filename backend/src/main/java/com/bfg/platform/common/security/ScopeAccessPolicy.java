package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Centralized policy class defining ALL scope access rules.
 * This is the single source of truth for scope-based authorization.
 */
@Component
public class ScopeAccessPolicy {

    /**
     * Determines which scopes a user with the given role and scope can access.
     *
     * @param role      the user's system role
     * @param userScope the user's assigned scope
     * @return set of scopes the user is allowed to access
     */
    public Set<ScopeType> getAllowedScopes(SystemRole role, ScopeType userScope) {
        if (role == null) {
            return Set.of();
        }
        return switch (role) {
            case APP_ADMIN, FEDERATION_ADMIN ->
                Set.of(ScopeType.INTERNAL, ScopeType.EXTERNAL, ScopeType.NATIONAL);
            case CLUB_ADMIN, COACH ->
                userScope != null ? Set.of(userScope) : Set.of(ScopeType.INTERNAL);
        };
    }

    /**
     * Determines if a user needs club restriction when accessing a resource type.
     * EXTERNAL and NATIONAL scope users are always restricted to their club for accreditations.
     * Athletes don't have direct clubId - they are accessed via accreditations.
     * Clubs don't require club restriction (users filter by scope).
     * Users don't require club restriction (users filter by scope/role).
     *
     * @param role         the user's system role
     * @param scope        the user's assigned scope
     * @param resourceType the type of resource being accessed
     * @return true if club restriction is required
     */
    public boolean requiresClubRestriction(SystemRole role, ScopeType scope, ResourceType resourceType) {
        if (role == null) {
            return true;
        }
        if (role == SystemRole.APP_ADMIN || role == SystemRole.FEDERATION_ADMIN) {
            return false;
        }
        // Only accreditations require club restriction for non-INTERNAL users
        // Athletes are accessed via accreditations (single athlete validation checks via accreditations)
        // Clubs and Users are filtered by scope, not by club
        if (resourceType == ResourceType.ACCREDITATION) {
            return scope != ScopeType.INTERNAL;
        }
        return false;
    }

    /**
     * Determines if a creator can create an entity with the target scope.
     *
     * @param creatorRole  the creator's system role
     * @param creatorScope the creator's assigned scope
     * @param targetRole   the role of the entity being created (for users)
     * @param targetScope  the scope of the entity being created
     * @return true if creation is allowed
     */
    public boolean canCreateWithScope(SystemRole creatorRole, ScopeType creatorScope,
                                       SystemRole targetRole, ScopeType targetScope) {
        if (targetScope == null) {
            targetScope = ScopeType.INTERNAL;
        }

        // Only INTERNAL scope users can create new users
        ScopeType effectiveCreatorScope = creatorScope != null ? creatorScope : ScopeType.INTERNAL;
        if (effectiveCreatorScope != ScopeType.INTERNAL) {
            return false;
        }

        // Only CLUB_ADMIN can have non-INTERNAL scope
        if (targetRole != null && targetRole != SystemRole.CLUB_ADMIN && targetScope != ScopeType.INTERNAL) {
            return false;
        }

        // APP_ADMIN/FEDERATION_ADMIN can create any scope (but must be INTERNAL themselves)
        if (creatorRole == SystemRole.APP_ADMIN || creatorRole == SystemRole.FEDERATION_ADMIN) {
            return true;
        }

        // CLUB_ADMIN can only create with their own scope
        return effectiveCreatorScope.equals(targetScope);
    }

    /**
     * Checks if the user can access a specific resource based on scope and club.
     *
     * @param userRole       the user's system role
     * @param userScope      the user's assigned scope
     * @param userClubId     the user's club ID (may be null for admins)
     * @param resourceScope  the resource's scope
     * @param resourceClubId the resource's club ID (may be null)
     * @param resourceType   the type of resource
     * @return true if access is allowed
     */
    public boolean canAccessResource(SystemRole userRole, ScopeType userScope, java.util.UUID userClubId,
                                      ScopeType resourceScope, java.util.UUID resourceClubId,
                                      ResourceType resourceType) {
        // Check scope access
        Set<ScopeType> allowedScopes = getAllowedScopes(userRole, userScope);
        if (!allowedScopes.contains(resourceScope)) {
            return false;
        }

        // Check club restriction if required
        if (requiresClubRestriction(userRole, userScope, resourceType)) {
            if (resourceClubId == null || userClubId == null) {
                return false;
            }
            return resourceClubId.equals(userClubId);
        }

        return true;
    }
}
