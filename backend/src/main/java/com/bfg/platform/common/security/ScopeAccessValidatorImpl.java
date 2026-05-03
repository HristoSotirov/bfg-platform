package com.bfg.platform.common.security;

import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import lombok.AllArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@AllArgsConstructor
public class ScopeAccessValidatorImpl implements ScopeAccessValidator {

    private static final Pattern TYPE_FILTER_PATTERN = Pattern.compile(
            "type\\s+eq\\s+['\"]?(\\w+)['\"]?",
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
        if (filter == null || filter.isBlank() || !isAuthenticated()) {
            return;
        }

        Set<ScopeType> requestedScopes = extractScopesFromFilter(filter);
        if (requestedScopes.isEmpty()) {
            return;
        }

        SystemRole userRole = securityContext.getUserRole();
        ScopeType clubType = resolveClubType(userRole);
        Set<ScopeType> allowedScopes = policy.getAllowedScopes(userRole, clubType);

        for (ScopeType requested : requestedScopes) {
            if (!allowedScopes.contains(requested)) {
                throw new ForbiddenException(
                        "Access denied: type '" + requested.getValue() +
                        "' is not permitted for your role."
                );
            }
        }
    }

    @Override
    public void validateFilterClub(String filter, ResourceType resourceType) {
        SystemRole role = securityContext.getUserRole();
        ScopeType clubType = resolveClubType(role);

        if (!policy.requiresClubRestriction(role, clubType, resourceType)) {
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
        ScopeType clubType = resolveClubType(userRole);

        Set<ScopeType> allowedScopes = policy.getAllowedScopes(userRole, clubType);
        if (!allowedScopes.contains(resourceScope)) {
            throw new ForbiddenException(
                    "Access denied: you do not have permission to access resources with type '" +
                    resourceScope.getValue() + "'."
            );
        }

        if (policy.requiresClubRestriction(userRole, clubType, resourceType)) {
            UUID userClubId = authorizationService.requireCurrentUserClubId();
            if (resourceClubId == null || !resourceClubId.equals(userClubId)) {
                throw new ForbiddenException(
                        "Access denied: you can only access resources from your own club."
                );
            }
        }
    }

    @Override
    public Set<ScopeType> resolveAllowedScopes() {
        if (!isAuthenticated()) {
            return Set.of(ScopeType.INTERNAL, ScopeType.EXTERNAL, ScopeType.NATIONAL);
        }
        SystemRole userRole = securityContext.getUserRole();
        ScopeType clubType = resolveClubType(userRole);
        return policy.getAllowedScopes(userRole, clubType);
    }

    @Override
    public <T> Specification<T> buildScopeRestriction(ResourceType resourceType, String scopeField) {
        if (!isAuthenticated()) {
            return Specification.where(null);
        }

        SystemRole userRole = securityContext.getUserRole();
        ScopeType clubType = resolveClubType(userRole);
        Set<ScopeType> allowedScopes = policy.getAllowedScopes(userRole, clubType);

        if (allowedScopes.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }

        if (allowedScopes.size() == 3) {
            return Specification.where(null);
        }

        return (root, query, cb) -> {
            String[] parts = scopeField.split("\\.");
            if (parts.length == 2) {
                return root.join(parts[0]).get(parts[1]).in(allowedScopes);
            }
            return root.get(parts[0]).in(allowedScopes);
        };
    }

    @Override
    public <T> Specification<T> buildClubRestriction(ResourceType resourceType, String clubIdField) {
        if (!isAuthenticated()) {
            return Specification.where(null);
        }

        SystemRole userRole = securityContext.getUserRole();
        ScopeType clubType = resolveClubType(userRole);

        if (!policy.requiresClubRestriction(userRole, clubType, resourceType)) {
            return Specification.where(null);
        }

        Optional<UUID> userClubOpt = authorizationService.findCurrentUserClubId();
        if (userClubOpt.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }

        UUID userClubId = userClubOpt.get();
        return (root, query, cb) -> cb.equal(root.get(clubIdField), userClubId);
    }

    private boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UUID;
    }

    private ScopeType resolveClubType(SystemRole role) {
        if (role == SystemRole.APP_ADMIN || role == SystemRole.FEDERATION_ADMIN) {
            return null;
        }
        Optional<UUID> clubId = authorizationService.findCurrentUserClubId();
        if (clubId.isEmpty()) {
            return null;
        }
        return authorizationService.getCurrentUserClubType();
    }

    private Set<ScopeType> extractScopesFromFilter(String filter) {
        Set<ScopeType> scopes = new HashSet<>();
        if (filter == null || filter.isBlank()) {
            return scopes;
        }

        Matcher matcher = TYPE_FILTER_PATTERN.matcher(filter);
        while (matcher.find()) {
            String scopeValue = matcher.group(1).toUpperCase();
            try {
                ScopeType scopeType = ScopeType.fromValue(scopeValue);
                scopes.add(scopeType);
            } catch (IllegalArgumentException e) {
                throw new ForbiddenException("Invalid type: " + scopeValue);
            }
        }
        return scopes;
    }

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
