package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ScopeAccessPolicyTest {

    private ScopeAccessPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new ScopeAccessPolicy();
    }

    @Nested
    @DisplayName("getAllowedScopes tests")
    class GetAllowedScopesTests {

        @Test
        @DisplayName("APP_ADMIN can access all scopes")
        void appAdmin_canAccessAllScopes() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.APP_ADMIN, ScopeType.INTERNAL);
            
            assertThat(allowed).containsExactlyInAnyOrder(
                ScopeType.INTERNAL, ScopeType.EXTERNAL, ScopeType.NATIONAL
            );
        }

        @Test
        @DisplayName("FEDERATION_ADMIN can access all scopes")
        void federationAdmin_canAccessAllScopes() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.FEDERATION_ADMIN, ScopeType.INTERNAL);
            
            assertThat(allowed).containsExactlyInAnyOrder(
                ScopeType.INTERNAL, ScopeType.EXTERNAL, ScopeType.NATIONAL
            );
        }

        @Test
        @DisplayName("CLUB_ADMIN with INTERNAL scope can only access INTERNAL")
        void clubAdmin_internal_canOnlyAccessInternal() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.CLUB_ADMIN, ScopeType.INTERNAL);
            
            assertThat(allowed).containsExactly(ScopeType.INTERNAL);
        }

        @Test
        @DisplayName("CLUB_ADMIN with EXTERNAL scope can only access EXTERNAL")
        void clubAdmin_external_canOnlyAccessExternal() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL);
            
            assertThat(allowed).containsExactly(ScopeType.EXTERNAL);
        }

        @Test
        @DisplayName("CLUB_ADMIN with NATIONAL scope can only access NATIONAL")
        void clubAdmin_national_canOnlyAccessNational() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.CLUB_ADMIN, ScopeType.NATIONAL);
            
            assertThat(allowed).containsExactly(ScopeType.NATIONAL);
        }

        @Test
        @DisplayName("COACH can only access their own scope")
        void coach_canOnlyAccessOwnScope() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.COACH, ScopeType.EXTERNAL);
            
            assertThat(allowed).containsExactly(ScopeType.EXTERNAL);
        }

        @Test
        @DisplayName("null role returns empty set")
        void nullRole_returnsEmptySet() {
            Set<ScopeType> allowed = policy.getAllowedScopes(null, ScopeType.INTERNAL);
            
            assertThat(allowed).isEmpty();
        }

        @Test
        @DisplayName("null scope defaults to INTERNAL for CLUB_ADMIN")
        void nullScope_defaultsToInternal() {
            Set<ScopeType> allowed = policy.getAllowedScopes(SystemRole.CLUB_ADMIN, null);
            
            assertThat(allowed).containsExactly(ScopeType.INTERNAL);
        }
    }

    @Nested
    @DisplayName("requiresClubRestriction tests")
    class RequiresClubRestrictionTests {

        @Test
        @DisplayName("APP_ADMIN does not require club restriction")
        void appAdmin_noClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.APP_ADMIN, ScopeType.INTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isFalse();
        }

        @Test
        @DisplayName("FEDERATION_ADMIN does not require club restriction")
        void federationAdmin_noClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.FEDERATION_ADMIN, ScopeType.INTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isFalse();
        }

        @Test
        @DisplayName("CLUB_ADMIN with INTERNAL scope does not require club restriction")
        void clubAdmin_internal_noClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.CLUB_ADMIN, ScopeType.INTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isFalse();
        }

        @Test
        @DisplayName("CLUB_ADMIN with EXTERNAL scope requires club restriction")
        void clubAdmin_external_requiresClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isTrue();
        }

        @Test
        @DisplayName("CLUB_ADMIN with NATIONAL scope requires club restriction")
        void clubAdmin_national_requiresClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.CLUB_ADMIN, ScopeType.NATIONAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isTrue();
        }

        @Test
        @DisplayName("COACH with EXTERNAL scope requires club restriction")
        void coach_external_requiresClubRestriction() {
            boolean required = policy.requiresClubRestriction(SystemRole.COACH, ScopeType.EXTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isTrue();
        }

        @Test
        @DisplayName("null role requires club restriction")
        void nullRole_requiresClubRestriction() {
            boolean required = policy.requiresClubRestriction(null, ScopeType.INTERNAL, ResourceType.ACCREDITATION);
            
            assertThat(required).isTrue();
        }
    }

    @Nested
    @DisplayName("canCreateWithScope tests")
    class CanCreateWithScopeTests {

        @Test
        @DisplayName("APP_ADMIN can create CLUB_ADMIN with any scope")
        void appAdmin_canCreateClubAdminWithAnyScope() {
            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.CLUB_ADMIN, ScopeType.INTERNAL
            )).isTrue();

            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL
            )).isTrue();

            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.CLUB_ADMIN, ScopeType.NATIONAL
            )).isTrue();
        }

        @Test
        @DisplayName("FEDERATION_ADMIN can create CLUB_ADMIN with any scope")
        void federationAdmin_canCreateClubAdminWithAnyScope() {
            assertThat(policy.canCreateWithScope(
                SystemRole.FEDERATION_ADMIN, ScopeType.INTERNAL,
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL
            )).isTrue();
        }

        @Test
        @DisplayName("CLUB_ADMIN can only create with their own scope")
        void clubAdmin_canOnlyCreateWithOwnScope() {
            assertThat(policy.canCreateWithScope(
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL,
                SystemRole.COACH, ScopeType.EXTERNAL
            )).isTrue();

            assertThat(policy.canCreateWithScope(
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL,
                SystemRole.COACH, ScopeType.INTERNAL
            )).isFalse();
        }

        @Test
        @DisplayName("Cannot create non-CLUB_ADMIN with non-INTERNAL scope")
        void cannotCreateNonClubAdminWithNonInternalScope() {
            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.COACH, ScopeType.EXTERNAL
            )).isFalse();

            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.FEDERATION_ADMIN, ScopeType.EXTERNAL
            )).isFalse();
        }

        @Test
        @DisplayName("Can create non-CLUB_ADMIN with INTERNAL scope")
        void canCreateNonClubAdminWithInternalScope() {
            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.COACH, ScopeType.INTERNAL
            )).isTrue();
        }

        @Test
        @DisplayName("null target scope defaults to INTERNAL")
        void nullTargetScope_defaultsToInternal() {
            assertThat(policy.canCreateWithScope(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL,
                SystemRole.COACH, null
            )).isTrue();
        }
    }

    @Nested
    @DisplayName("canAccessResource tests")
    class CanAccessResourceTests {

        private final UUID userClubId = UUID.randomUUID();
        private final UUID resourceClubId = UUID.randomUUID();

        @Test
        @DisplayName("APP_ADMIN can access any resource regardless of scope or club")
        void appAdmin_canAccessAnyResource() {
            assertThat(policy.canAccessResource(
                SystemRole.APP_ADMIN, ScopeType.INTERNAL, null,
                ScopeType.EXTERNAL, resourceClubId, ResourceType.ACCREDITATION
            )).isTrue();
        }

        @Test
        @DisplayName("CLUB_ADMIN cannot access resource with different scope")
        void clubAdmin_cannotAccessDifferentScope() {
            assertThat(policy.canAccessResource(
                SystemRole.CLUB_ADMIN, ScopeType.INTERNAL, userClubId,
                ScopeType.EXTERNAL, resourceClubId, ResourceType.ACCREDITATION
            )).isFalse();
        }

        @Test
        @DisplayName("EXTERNAL CLUB_ADMIN can access resource from same club")
        void externalClubAdmin_canAccessSameClub() {
            assertThat(policy.canAccessResource(
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL, userClubId,
                ScopeType.EXTERNAL, userClubId, ResourceType.ACCREDITATION
            )).isTrue();
        }

        @Test
        @DisplayName("EXTERNAL CLUB_ADMIN cannot access resource from different club")
        void externalClubAdmin_cannotAccessDifferentClub() {
            assertThat(policy.canAccessResource(
                SystemRole.CLUB_ADMIN, ScopeType.EXTERNAL, userClubId,
                ScopeType.EXTERNAL, resourceClubId, ResourceType.ACCREDITATION
            )).isFalse();
        }

        @Test
        @DisplayName("INTERNAL CLUB_ADMIN can access any INTERNAL resource")
        void internalClubAdmin_canAccessAnyInternalResource() {
            assertThat(policy.canAccessResource(
                SystemRole.CLUB_ADMIN, ScopeType.INTERNAL, userClubId,
                ScopeType.INTERNAL, resourceClubId, ResourceType.ACCREDITATION
            )).isTrue();
        }
    }
}
