import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SystemRole } from '../models/navigation.model';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as SystemRole[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRoles = this.authService.getCurrentUserRoles();
    const hasAccess = requiredRoles.some(role => userRoles.includes(role));

    if (!hasAccess) {
      this.router.navigate(['/'], {
        queryParams: { error: 'access_denied' }
      });
      return false;
    }

    return true;
  }
}
