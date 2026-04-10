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
import {
  ScoringRulesService,
  ScoringRuleRequest,
} from '../../../../core/services/api';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-scoring-rule-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './add-scoring-rule-dialog.component.html',
  styleUrl: './add-scoring-rule-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddScoringRuleDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() scoringSchemeId = '';
  @Input() nextPlacement = 1;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    placement: null as number | null,
    basePoints: null as number | null,
  };

  saving = false;
  error: string | null = null;

  constructor(
    private scoringRulesService: ScoringRulesService,
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
      placement: this.nextPlacement,
      basePoints: null,
    };
    this.error = null;
    this.saving = false;
  }

  get isFormValid(): boolean {
    return (
      this.formData.placement != null &&
      this.formData.placement > 0 &&
      this.formData.basePoints != null &&
      !!this.scoringSchemeId
    );
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringRuleRequest = {
      scoringSchemeId: this.scoringSchemeId,
      placement: this.formData.placement!,
      basePoints: this.formData.basePoints!,
    };

    this.scoringRulesService
      .createScoringRule(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err?.error?.message || 'Грешка при създаване на правило';
          this.cdr.markForCheck();
        },
      });
  }
}
