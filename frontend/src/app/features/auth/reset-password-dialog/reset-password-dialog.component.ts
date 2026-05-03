import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AuthService as AuthApiService } from '../../../core/services/api';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './reset-password-dialog.component.html',
  styleUrl: './reset-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() token = '';
  @Output() closed = new EventEmitter<void>();
  @Output() resetSuccess = new EventEmitter<void>();

  newPassword = '';
  confirmPassword = '';
  touched = { newPassword: false, confirmPassword: false };
  saving = false;
  error: string | null = null;
  success = false;
  showPassword = false;

  constructor(
    private authApiService: AuthApiService,
    public cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.reset();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private reset(): void {
    this.newPassword = '';
    this.confirmPassword = '';
    this.touched = { newPassword: false, confirmPassword: false };
    this.saving = false;
    this.error = null;
    this.success = false;
    this.showPassword = false;
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get hasDigit(): boolean {
    return /\d/.test(this.newPassword);
  }

  get hasSpecial(): boolean {
    return /[!@#$%^&*]/.test(this.newPassword);
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword && this.confirmPassword.length > 0;
  }

  get isFormValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasDigit && this.hasSpecial && this.passwordsMatch;
  }

  submit(): void {
    this.touched = { newPassword: true, confirmPassword: true };
    if (!this.isFormValid) {
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    this.authApiService.resetPassword({ token: this.token, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.saving = false;
        this.success = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.error = err?.error?.message || 'Възникна грешка. Моля, опитайте отново.';
        this.cdr.markForCheck();
      },
    });
  }

  finishSuccess(): void {
    this.resetSuccess.emit();
    this.closed.emit();
  }
}
