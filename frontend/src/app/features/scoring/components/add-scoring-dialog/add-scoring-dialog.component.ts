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
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import {
  ScoringSchemesService,
  ScoringSchemeRequest,
  ScoringType,
} from '../../../../core/services/api';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-scoring-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './add-scoring-dialog.component.html',
  styleUrl: './add-scoring-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddScoringDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    name: '',
    scoringType: '' as string,
    isActive: true,
  };

  touched: Record<string, boolean> = {};

  readonly scoringTypeOptions: SearchableSelectOption[] = [
    { value: ScoringType.Fixed, label: 'Фиксирано' },
    { value: ScoringType.OffsetFromEnd, label: 'От края' },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: this.translate.instant('common.status.active') },
    { value: 'false', label: this.translate.instant('common.status.inactive') },
  ];

  saving = false;
  error: string | null = null;

  constructor(
    private scoringSchemesService: ScoringSchemesService,
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
      scoringType: '',
      isActive: true,
    };
    this.touched = {};
    this.error = null;
    this.saving = false;
  }

  get isFormValid(): boolean {
    return !!(this.formData.name && this.formData.scoringType);
  }

  save(): void {
    this.touched['name'] = true;
    this.cdr.markForCheck();
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeRequest = {
      name: this.formData.name.trim(),
      scoringType: this.formData.scoringType as ScoringType,
      isActive: this.formData.isActive,
    };

    this.scoringSchemesService
      .createScoringScheme(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err?.error?.message || this.translate.instant('scoring.form.createError');
          this.cdr.markForCheck();
        },
      });
  }
}
