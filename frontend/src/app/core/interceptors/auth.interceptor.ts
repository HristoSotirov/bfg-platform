import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, timeout, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';

interface PendingRequest {
  request: HttpRequest<any>;
  next: HttpHandler;
  observer: {
    next: (value: HttpEvent<any>) => void;
    error: (error: any) => void;
    complete: () => void;
  };
  retryCount: number;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null | 'error'> =
    new BehaviorSubject<string | null | 'error'>(null);
  private pendingRequests: PendingRequest[] = [];
  private readonly MAX_RETRY_ATTEMPTS = 1;
  private refreshAttempts = 0;
  private readonly MAX_REFRESH_ATTEMPTS = 2;
  private refreshStartTime: number | null = null;
  private readonly REFRESH_TIMEOUT_MS = 15000; // 15 second timeout for refresh

  constructor(
    private authService: AuthService,
    private languageService: LanguageService,
  ) {
    // Safety: Reset stuck refresh state on service init
    this.checkAndResetStuckState();
  }

  /**
   * Check if refresh state is stuck and reset it
   */
  private checkAndResetStuckState(): void {
    if (this.isRefreshing && this.refreshStartTime) {
      const elapsed = Date.now() - this.refreshStartTime;
      if (elapsed > this.REFRESH_TIMEOUT_MS) {
        console.warn(
          '[AuthInterceptor] Detected stuck refresh state, resetting',
        );
        this.resetRefreshingState();
      }
    }
  }

  /**
   * Reset the refreshing state - call when user logs out or state is stuck
   */
  resetRefreshingState(): void {
    this.isRefreshing = false;
    this.refreshStartTime = null;
    this.refreshAttempts = 0;
    this.refreshTokenSubject.next(null);
    this.pendingRequests = [];
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Safety check: reset stuck refresh state
    this.checkAndResetStuckState();

    // Only add Accept-Language header - OpenAPI services handle Authorization via Configuration
    const lang = this.languageService.currentLanguage || 'bg';
    request = request.clone({
      setHeaders: {
        'Accept-Language': lang,
      },
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Don't try to refresh for auth endpoints
        const isAuthEndpoint =
          request.url.includes('/auth/login') ||
          request.url.includes('/auth/logout') ||
          request.url.includes('/auth/refresh');
        if (error.status === 401 && !isAuthEndpoint) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    const lang = this.languageService.currentLanguage || 'bg';
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': lang,
      },
    });
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler,
    retryCount = 0,
  ): Observable<HttpEvent<any>> {
    // Check if this request has exceeded retry limit
    if (retryCount >= this.MAX_RETRY_ATTEMPTS) {
      this.authService.logout();
      return throwError(() => new Error('Authentication failed after retry'));
    }

    // If we're already refreshing, queue this request (with timeout protection)
    if (this.isRefreshing) {
      // Safety: check if refresh is stuck
      this.checkAndResetStuckState();

      // If still refreshing after check, queue the request
      if (this.isRefreshing) {
        return new Observable<HttpEvent<any>>((observer) => {
          this.pendingRequests.push({ request, next, observer, retryCount });
        });
      }
    }

    // Check if we've exceeded max refresh attempts (prevent infinite loops)
    if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
      this.refreshAttempts = 0;
      this.authService.logout();
      return throwError(() => new Error('Token refresh failed repeatedly'));
    }

    // Start the refresh process
    this.isRefreshing = true;
    this.refreshStartTime = Date.now();
    this.refreshAttempts++;
    this.refreshTokenSubject.next(null);

    const refreshToken = this.authService.getRefreshToken();
    if (!refreshToken) {
      this.isRefreshing = false;
      this.refreshAttempts = 0;
      this.refreshTokenSubject.next('error');
      this.processPendingRequests('error');
      this.authService.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.authService.refreshToken().pipe(
      timeout(10000),
      switchMap((tokenResponse) => {
        const newToken = tokenResponse.accessToken || '';
        this.isRefreshing = false;
        this.refreshStartTime = null;
        this.refreshAttempts = 0;
        this.refreshTokenSubject.next(newToken);

        // Process all pending requests with the new token
        this.processPendingRequests(newToken);

        // Retry the current request with incremented retry count
        return next.handle(this.addToken(request, newToken)).pipe(
          catchError((retryError: HttpErrorResponse) => {
            if (retryError.status === 401) {
              return this.handle401Error(request, next, retryCount + 1);
            }
            return throwError(() => retryError);
          }),
        );
      }),
      catchError((error) => {
        this.isRefreshing = false;
        this.refreshStartTime = null;
        this.refreshTokenSubject.next('error');
        this.processPendingRequests('error');
        return throwError(() => error);
      }),
      finalize(() => {
        // Clean up if needed
      }),
    );
  }

  private processPendingRequests(token: string | 'error'): void {
    const requests = [...this.pendingRequests];
    this.pendingRequests = [];

    if (token === 'error') {
      requests.forEach(({ observer }) => {
        observer.error(new Error('Token refresh failed'));
      });
      return;
    }

    // Retry all pending requests with the new token
    requests.forEach(({ request, next, observer, retryCount }) => {
      next.handle(this.addToken(request, token)).subscribe({
        next: (value) => observer.next(value),
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 && retryCount < this.MAX_RETRY_ATTEMPTS) {
            this.handle401Error(request, next, retryCount + 1).subscribe({
              next: (value) => observer.next(value),
              error: (err) => observer.error(err),
              complete: () => observer.complete(),
            });
          } else {
            observer.error(error);
          }
        },
        complete: () => observer.complete(),
      });
    });
  }
}
