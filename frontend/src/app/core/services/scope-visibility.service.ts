import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SystemRole } from './api';

/**
 * Centralized service for scope-based UI visibility rules.
 * Determines what scope-related features should be visible based on user role.
 * Since scopeType has been removed from the user/JWT, only role-based checks remain.
 */
@Injectable({ providedIn: 'root' })
export class ScopeVisibilityService {
  constructor(private authService: AuthService) {}

  /**
   * Can user see the type filter/column in UI?
   * Only APP_ADMIN and FEDERATION_ADMIN can see type features.
   */
  canViewTypeField(): boolean {
    return this.isAdmin();
  }

  /**
   * Helper that returns true for APP_ADMIN/FEDERATION_ADMIN.
   */
  isAdmin(): boolean {
    const role = this.getCurrentRole();
    return role === SystemRole.AppAdmin || role === SystemRole.FederationAdmin;
  }

  private getCurrentRole(): SystemRole | undefined {
    const roles = this.authService.getCurrentUserRoles();
    return roles.length > 0 ? roles[0] : undefined;
  }
}
