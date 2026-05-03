package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;
import java.util.UUID;

public interface ScopeAccessValidator {

    void validateFilterScope(String filter);

    void validateFilterClub(String filter, ResourceType resourceType);

    void validateResourceAccess(ScopeType resourceScope, UUID resourceClubId, ResourceType resourceType);

    Set<ScopeType> resolveAllowedScopes();

    <T> Specification<T> buildScopeRestriction(ResourceType resourceType, String scopeField);

    <T> Specification<T> buildClubRestriction(ResourceType resourceType, String clubIdField);
}
