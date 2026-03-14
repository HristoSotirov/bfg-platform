package com.bfg.platform.common.security;

import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Implementation of ScopeAccessValidator that validates requests against the ScopeAccessPolicy.
 */
@Service
@AllArgsConstructor
public class ScopeAccessValidatorImpl implements ScopeAccessValidator {

    private static final Pattern SCOPE_TYPE_PATTERN = Pattern.compile(
            "scopeType\\s+eq\\s+['\"]?(\\w+)['\"]?",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern CLUB_ID_PATTERN = Pattern.compile(
            "clubId\\s+eq\\s+['\"]?([a-fA-F0-9-]+)['\"]?",
            Pattern.CASE_INSENSITIVE
    );

    private final SecurityContextHelper securityContext;
    private final ScopeAccessPolicy policy;
    private final AuthorizationService authorizationService;

    @Override
    public void validateFilterScope(String filter) {
        if (filter == null || filter.isBlank()) {
            return;
        }

        Set<ScopeType> requestedScopes = extractScopesFromFilter(filter);
        if (requestedScopes.isEmpty()) {
            return;
        }

        SystemRole userRole = securityContext.getUserRole();
        ScopeType userScope = securityContext.getScopeType();
        Set<ScopeType> allowedScopes = policy.getAllowedScopes(userRole, userScope);

        for (ScopeType requested : requestedScopes) {
            if (!allowedScopes.contains(requested)) {
                throw new ForbiddenException(
                        "Access denied: scope '" + requested.getValue() + 
                        "' is not permitted for your role. Your allowed scope is '" + 
                        userScope.getValue() + "'."
                );
            }
        }
    }

    @Override
    public void validateFilterClub(String filter, ResourceType resourceType) {
        SystemRole role = securityContext.getUserRole();
        ScopeType scope = securityContext.getScopeType();

        if (!policy.requiresClubRestriction(role, scope, resourceType)) {
            return;
        }

        UUID userClubId = authorizationService.requireCurrentUserClubId();
        Optional<UUID> filterClubId = extractClubIdFromFilter(filter);

        if (filterClubId.isPresent()) {
            if (!filterClubId.get().equals(userClubId)) {
                throw new ForbiddenException(
                        "Access denied: you can only access data from your own club."
                );
            }
        } else {
            throw new ForbiddenException(
                    "Club filter is required. You must filter by your own club."
            );
        }
    }

    @Override
    public void validateResourceAccess(ScopeType resourceScope, UUID resourceClubId, ResourceType resourceType) {
        SystemRole userRole = securityContext.getUserRole();
        ScopeType userScope = securityContext.getScopeType();

        Set<ScopeType> allowedScopes = policy.getAllowedScopes(userRole, userScope);
        if (!allowedScopes.contains(resourceScope)) {
            throw new ForbiddenException(
                    "Access denied: you do not have permission to access resources with scope '" +
                    resourceScope.getValue() + "'."
            );
        }

        if (policy.requiresClubRestriction(userRole, userScope, resourceType)) {
            UUID userClubId = authorizationService.requireCurrentUserClubId();
            if (resourceClubId == null || !resourceClubId.equals(userClubId)) {
                throw new ForbiddenException(
                        "Access denied: you can only access resources from your own club."
                );
            }
        }
    }

    @Override
    public void validateCreateScope(SystemRole targetRole, ScopeType targetScope) {
        SystemRole creatorRole = securityContext.getUserRole();
        ScopeType creatorScope = securityContext.getScopeType();

        if (!policy.canCreateWithScope(creatorRole, creatorScope, targetRole, targetScope)) {
            String targetScopeStr = targetScope != null ? targetScope.getValue() : "INTERNAL";
            String targetRoleStr = targetRole != null ? targetRole.getValue() : "entity";
            throw new ForbiddenException(
                    "You cannot create a " + targetRoleStr + " with scope " + targetScopeStr + "."
            );
        }
    }

    /**
     * Extracts all scope types mentioned in the filter string.
     */
    private Set<ScopeType> extractScopesFromFilter(String filter) {
        Set<ScopeType> scopes = new HashSet<>();
        if (filter == null || filter.isBlank()) {
            return scopes;
        }

        Matcher matcher = SCOPE_TYPE_PATTERN.matcher(filter);
        while (matcher.find()) {
            String scopeValue = matcher.group(1).toUpperCase();
            try {
                ScopeType scopeType = ScopeType.fromValue(scopeValue);
                scopes.add(scopeType);
            } catch (IllegalArgumentException e) {
                throw new ForbiddenException("Invalid scope type: " + scopeValue);
            }
        }
        return scopes;
    }

    /**
     * Extracts the club ID from the filter string if present.
     */
    private Optional<UUID> extractClubIdFromFilter(String filter) {
        if (filter == null || filter.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = CLUB_ID_PATTERN.matcher(filter);
        if (matcher.find()) {
            String clubIdStr = matcher.group(1);
            try {
                return Optional.of(UUID.fromString(clubIdStr));
            } catch (IllegalArgumentException e) {
                throw new ForbiddenException("Invalid club ID format: " + clubIdStr);
            }
        }
        return Optional.empty();
    }
}
