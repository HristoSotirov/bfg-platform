import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { ScopeType, SystemRole } from './api';

/**
 * Centralized service for scope-based UI visibility rules.
 * Determines what scope-related features should be visible based on user role and scope.
 */
@Injectable({ providedIn: 'root' })
export class ScopeVisibilityService {
  constructor(private authService: AuthService) {}

  /**
   * Can user see scope filter/column in UI?
   * Only APP_ADMIN and FEDERATION_ADMIN can see scope features.
   */
  canViewScopeField(): boolean {
    const role = this.getCurrentRole();
    return role === 'APP_ADMIN' || role === 'FEDERATION_ADMIN';
  }

  /**
   * Get scopes user can filter by.
   * APP_ADMIN/FEDERATION_ADMIN can filter by all scopes.
   * Others can only filter by their own scope.
   */
  getAllowedScopes(): ScopeType[] {
    const role = this.getCurrentRole();
    if (role === 'APP_ADMIN' || role === 'FEDERATION_ADMIN') {
      return [ScopeType.Internal, ScopeType.External, ScopeType.National];
    }
    const userScope = this.authService.getScopeType();
    return userScope ? [userScope as ScopeType] : [ScopeType.Internal];
  }

  /**
   * Can user see club filter?
   * EXTERNAL/NATIONAL CLUB_ADMIN/COACH can't see club filter (always their club).
   */
  canViewClubFilter(): boolean {
    const role = this.getCurrentRole();
    const scope = this.authService.getScopeType();
    
    // APP_ADMIN and FEDERATION_ADMIN can always see club filter
    if (role === 'APP_ADMIN' || role === 'FEDERATION_ADMIN') {
      return true;
    }
    
    // INTERNAL scope users can see club filter
    if (scope === 'INTERNAL') {
      return true;
    }
    
    // EXTERNAL/NATIONAL CLUB_ADMIN/COACH can't see club filter
    return false;
  }

  /**
   * Get user's scope type.
   */
  getUserScope(): ScopeType {
    const scope = this.authService.getScopeType();
    return scope ? (scope as ScopeType) : ScopeType.Internal;
  }

  /**
   * Build default filter based on user's restrictions.
   * Returns scopeType that should be applied by default.
   * Note: clubId must be fetched separately via getClubByAdminId/getClubByCoachId APIs.
   */
  buildDefaultFilter(): { scopeType?: ScopeType } {
    const result: { scopeType?: ScopeType } = {};

    // If user can't see scope field, default to their scope
    if (!this.canViewScopeField()) {
      result.scopeType = this.getUserScope();
    }

    return result;
  }

  /**
   * Can user create users with different scopes?
   * Only APP_ADMIN and FEDERATION_ADMIN can create CLUB_ADMIN with different scopes.
   */
  canAssignDifferentScopes(): boolean {
    const role = this.getCurrentRole();
    return role === 'APP_ADMIN' || role === 'FEDERATION_ADMIN';
  }

  /**
   * Get available scope options for creating a CLUB_ADMIN.
   */
  getAvailableScopeOptionsForCreate(): ScopeType[] {
    if (this.canAssignDifferentScopes()) {
      return [ScopeType.Internal, ScopeType.External, ScopeType.National];
    }
    // Others can only create with their own scope
    return [this.getUserScope()];
  }

  /**
   * Is the current user internal scope?
   * Only INTERNAL scope users can create new users.
   */
  isInternalScope(): boolean {
    const scope = this.authService.getScopeType();
    return scope === 'INTERNAL' || scope === null || scope === undefined;
  }

  private getCurrentRole(): SystemRole | undefined {
    const roles = this.authService.getCurrentUserRoles();
    return roles.length > 0 ? roles[0] : undefined;
  }
}
