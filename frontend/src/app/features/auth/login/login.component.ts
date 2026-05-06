import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService, AppLanguage } from '../../../core/services/language.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ForgotPasswordDialogComponent } from '../forgot-password-dialog/forgot-password-dialog.component';
import { ResetPasswordDialogComponent } from '../reset-password-dialog/reset-password-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ButtonComponent, ForgotPasswordDialogComponent, ResetPasswordDialogComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  error = '';
  private destroy$ = new Subject<void>();

  isForgotPasswordOpen = false;
  isResetPasswordOpen = false;
  resetToken = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private languageService: LanguageService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['resetToken']) {
        this.resetToken = params['resetToken'];
        this.isResetPasswordOpen = true;
        this.cdr.markForCheck();
      }
    });

    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth) => {
        if (isAuth) {
          this.router.navigate(['/']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.error = '';
      this.cdr.markForCheck();
      const credentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate(['/']);
        },
        error: (errorMessage: string) => {
          this.error = errorMessage;
          this.cdr.markForCheck();
        },
      });
    } else {
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
      this.cdr.markForCheck();
    }
  }

  continueAsGuest(): void {
    this.router.navigate(['/']);
  }

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage;
  }

  switchLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
  }

  openForgotPassword(): void {
    this.isForgotPasswordOpen = true;
    this.cdr.markForCheck();
  }

  closeForgotPassword(): void {
    this.isForgotPasswordOpen = false;
    this.cdr.markForCheck();
  }

  closeResetPassword(): void {
    this.isResetPasswordOpen = false;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.cdr.markForCheck();
  }
}
