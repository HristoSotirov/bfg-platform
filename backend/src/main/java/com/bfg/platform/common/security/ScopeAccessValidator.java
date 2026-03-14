package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;

import java.util.UUID;

/**
 * Validator for scope-based access control.
 * Validates incoming requests against the access policy and throws ForbiddenException on violations.
 */
public interface ScopeAccessValidator {

    /**
     * Validates that the scope values in the filter string are allowed for the current user.
     *
     * @param filter the filter string to validate
     * @throws com.bfg.platform.common.exception.ForbiddenException if scope validation fails
     */
    void validateFilterScope(String filter);

    /**
     * Validates that the club ID in the filter is allowed for the current user.
     * For users requiring club restriction, they must filter by their own club.
     *
     * @param filter       the filter string to validate
     * @param resourceType the type of resource being accessed
     * @throws com.bfg.platform.common.exception.ForbiddenException if club validation fails
     */
    void validateFilterClub(String filter, ResourceType resourceType);

    /**
     * Validates access to a single resource based on its scope and club.
     *
     * @param resourceScope  the scope of the resource
     * @param resourceClubId the club ID of the resource (may be null)
     * @param resourceType   the type of resource
     * @throws com.bfg.platform.common.exception.ForbiddenException if access is denied
     */
    void validateResourceAccess(ScopeType resourceScope, UUID resourceClubId, ResourceType resourceType);

    /**
     * Validates that the current user can create an entity with the specified scope.
     *
     * @param targetRole  the role of the entity being created (for users)
     * @param targetScope the scope of the entity being created
     * @throws com.bfg.platform.common.exception.ForbiddenException if creation is not allowed
     */
    void validateCreateScope(SystemRole targetRole, ScopeType targetScope);
}
