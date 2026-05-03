import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AuthService as AuthApiService } from '../../../core/services/api';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './forgot-password-dialog.component.html',
  styleUrl: './forgot-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordDialogComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  username = '';
  touched = false;
  sending = false;
  error: string | null = null;
  success = false;
  cooldownSeconds = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authApiService: AuthApiService,
    public cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.touched = false;
      this.sending = false;
      this.error = null;
      if (!this.success && this.cooldownSeconds === 0) {
        this.username = '';
      }
    }
  }

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  close(): void {
    this.closed.emit();
  }

  get cooldownActive(): boolean {
    return this.cooldownSeconds > 0;
  }

  submit(): void {
    this.touched = true;
    if (!this.username.trim()) {
      return;
    }

    this.sending = true;
    this.error = null;
    this.cdr.markForCheck();

    this.authApiService.forgotPassword({ username: this.username.trim() }).subscribe({
      next: () => {
        this.sending = false;
        this.success = true;
        this.startCooldown();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.sending = false;
        this.error = err?.error?.message || 'Възникна грешка. Моля, опитайте отново.';
        this.cdr.markForCheck();
      },
    });
  }

  sendAgain(): void {
    this.success = false;
    this.cdr.markForCheck();
  }

  private startCooldown(): void {
    this.cooldownSeconds = 60;
    this.clearCooldown();
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        this.clearCooldown();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }
}
