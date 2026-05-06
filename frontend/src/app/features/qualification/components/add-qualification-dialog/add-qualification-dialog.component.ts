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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  QualificationSchemesService,
  QualificationSchemeRequest,
} from '../../../../core/services/api';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-qualification-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './add-qualification-dialog.component.html',
  styleUrl: './add-qualification-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddQualificationDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    name: '',
    laneCount: null as number | null,
  };

  touched: Record<string, boolean> = {};

  saving = false;
  error: string | null = null;

  constructor(
    private schemesService: QualificationSchemesService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      laneCount: null,
    };
    this.touched = {};
    this.error = null;
    this.saving = false;
  }

  get isFormValid(): boolean {
    return !!(this.formData.name && this.formData.laneCount != null && this.formData.laneCount > 0);
  }

  save(): void {
    this.touched['name'] = true;
    this.cdr.markForCheck();
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: QualificationSchemeRequest = {
      name: this.formData.name.trim(),
      laneCount: this.formData.laneCount!,
      isActive: true,
    };

    this.schemesService
      .createQualificationScheme(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err?.error?.message || this.translate.instant('qualification.form.createError');
          this.cdr.markForCheck();
        },
      });
  }
}
