import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, map, tap, Subscription, shareReplay } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { SystemRole } from '../models/navigation.model';
import { AuthService as ApiAuthService } from './api/api/auth.service';
import { LoginRequest } from './api/model/loginRequest';
import { RefreshRequest } from './api/model/refreshRequest';
import { TokenResponse } from './api/model/tokenResponse';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';
  
  // Refresh 2 minutes before expiration
  private readonly REFRESH_BUFFER_SECONDS = 120;

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$: Observable<boolean>;

  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private refreshSubscription: Subscription | null = null;
  private isRefreshing = false; // Flag to prevent concurrent refresh operations
  private currentRefresh$: Observable<TokenResponse> | null = null; // Shared refresh observable

  constructor(
    private router: Router,
    private apiAuthService: ApiAuthService
  ) {
    this.isAuthenticated$ = this.currentUserSubject.pipe(
      map(user => !!user && !!this.getAccessToken())
    );
    
    // If user is already logged in (page refresh), validate and start the refresh timer
    const token = this.getAccessToken();
    if (token) {
      const expiration = this.getTokenExpiration(token);
      if (expiration && expiration > Date.now()) {
        // Token is still valid, schedule refresh
        this.scheduleTokenRefresh();
      } else {
        // Token expired, clear storage silently
        this.clearStorage();
        this.currentUserSubject.next(null);
      }
    }
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    // Clear any previous state before attempting login
    this.clearRefreshTimer();
    
    return this.apiAuthService.login(credentials).pipe(
      tap(response => {
        this.storeTokens(response);
        this.decodeAndStoreUser(response.accessToken);
        this.scheduleTokenRefresh();
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.extractErrorMessage(error));
      })
    );
  }

  refreshToken(): Observable<TokenResponse> {
    // If already refreshing, return the shared observable
    if (this.isRefreshing && this.currentRefresh$) {
      return this.currentRefresh$;
    }

    this.isRefreshing = true;
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.isRefreshing = false;
      this.currentRefresh$ = null;
      return throwError(() => 'No refresh token available');
    }

    const request: RefreshRequest = { refreshToken };
    
    // Create a shared observable that multiple callers can subscribe to
    this.currentRefresh$ = this.apiAuthService.refresh(request).pipe(
      tap(response => {
        this.storeTokens(response);
        this.decodeAndStoreUser(response.accessToken);
        this.isRefreshing = false;
        this.currentRefresh$ = null;
        // Reschedule the timer after successful refresh
        this.scheduleTokenRefresh();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthService] Token refresh failed:', error.status, error.message);
        this.isRefreshing = false;
        this.currentRefresh$ = null;
        this.clearRefreshTimer();
        this.clearStorage();
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        return throwError(() => this.extractErrorMessage(error));
      }),
      shareReplay(1) // Share the result with all subscribers
    );

    return this.currentRefresh$;
  }

  /**
   * Check if a token refresh is currently in progress
   */
  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  logout(): void {
    this.isRefreshing = false;
    this.currentRefresh$ = null;
    this.clearRefreshTimer();
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentUserRoles(): SystemRole[] {
    const user = this.getCurrentUser();
    return user?.roles || [];
  }

  getScopeType(): string | undefined {
    return this.getCurrentUser()?.scopeType;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }

  /**
   * Check if a token is still valid (not expired)
   */
  isTokenValid(token: string): boolean {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return false;
      }
      
      const now = Date.now();
      const isValid = expiration > (now + 10000);
      return isValid;
    } catch (error) {
      console.error('[AuthService] Error checking token validity:', error);
      return false;
    }
  }

  // ===== Token Refresh Timer =====
  
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer();
    
    const token = this.getAccessToken();
    if (!token) return;

    const expiration = this.getTokenExpiration(token);
    if (!expiration) return;

    const now = Date.now();
    const expiresIn = expiration - now;
    
    // If token is already expired, don't try to refresh - just logout
    if (expiresIn <= 0) {
      this.clearStorage();
      this.currentUserSubject.next(null);
      return;
    }
    
    // Schedule refresh 2 minutes before expiration
    const refreshIn = expiresIn - (this.REFRESH_BUFFER_SECONDS * 1000);
    
    // If we're within the buffer window, refresh in 5 seconds (with a minimum delay to prevent loops)
    const actualRefreshIn = Math.max(refreshIn, 5000);
    
    this.refreshTimerId = setTimeout(() => {
      this.performTokenRefresh();
    }, actualRefreshIn);
  }

  private performTokenRefresh(): void {
    // Don't trigger scheduled refresh if interceptor is already refreshing
    if (this.isRefreshing) {
      // Don't reschedule here - let the current refresh handle it
      return;
    }

    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = this.refreshToken().subscribe({
      next: () => {
        // Refresh completed successfully
      },
      error: () => {
        console.error('[AuthService] Scheduled refresh failed');
        // Error handling is done in refreshToken method
      }
    });
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = null;
  }

  private getTokenExpiration(token: string): number | null {
    try {
      const payload = this.decodeTokenPayload(token);
      if (payload && payload.exp) {
        // exp is in seconds, convert to milliseconds
        return payload.exp * 1000;
      }
      return null;
    } catch {
      return null;
    }
  }

  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
      const jsonString = decodeURIComponent(
        atob(padded)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  // ===== Error Handling =====

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Проблем с връзката към сървъра.';
    }
    if (error.status >= 500) {
      return 'Неочаквана грешка. Моля, опитайте отново.';
    }
    if (error.error && error.error.message) {
      return error.error.message;
    }
    return 'Неочаквана грешка. Моля, опитайте отново.';
  }

  // ===== Storage =====

  private storeTokens(response: TokenResponse): void {
    if (!response?.accessToken || !response?.refreshToken) {
      return;
    }
    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
  }

  private decodeAndStoreUser(token: string): void {
    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload) return;
      
      const role = payload.role || payload.roles?.[0];
      const scopeType = payload.scopeType;
      const user: User = {
        uuid: payload.sub || '',
        username: payload.username || '',
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        roles: role ? [role as SystemRole] : [],
        scopeType: scopeType ?? undefined
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch {
      // Token decode failed silently
    }
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private clearStorage(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
