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
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
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

  readonly scoringTypeOptions: SearchableSelectOption[] = [
    { value: ScoringType.Fixed, label: 'Фиксирано' },
    { value: ScoringType.OffsetFromEnd, label: 'От края' },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  saving = false;
  error: string | null = null;

  constructor(
    private scoringSchemesService: ScoringSchemesService,
    private cdr: ChangeDetectorRef,
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
    this.error = null;
    this.saving = false;
  }

  get isFormValid(): boolean {
    return !!(this.formData.name && this.formData.scoringType);
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeRequest = {
      name: this.formData.name,
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
            err?.error?.message || 'Грешка при създаване на схема за точкуване';
          this.cdr.markForCheck();
        },
      });
  }
}
