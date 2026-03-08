import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // Let the interceptor handle token refresh - don't block navigation
    // This prevents the page from being stuck if token is expired
    const token = this.authService.getAccessToken();
    if (token) {
      const isValid = this.authService.isTokenValid(token);
      if (!isValid) {
        // Don't block - let the page load and the interceptor will trigger refresh
      }
    }

    return true;
  }
}
