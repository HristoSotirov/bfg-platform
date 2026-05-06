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
  ScoringSchemeBoatCoefficientsService,
  ScoringSchemeBoatCoefficientRequest,
  BoatClass,
} from '../../../../core/services/api';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-boat-coefficient-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './add-boat-coefficient-dialog.component.html',
  styleUrl: './add-boat-coefficient-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddBoatCoefficientDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() scoringSchemeId = '';

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    boatClass: '' as string,
    coefficient: null as number | null,
  };

  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: BoatClass.SingleScull, label: '1X' },
    { value: BoatClass.DoubleScull, label: '2X' },
    { value: BoatClass.CoxedPair, label: '2+' },
    { value: BoatClass.Pair, label: '2-' },
    { value: BoatClass.Quad, label: '4X' },
    { value: BoatClass.CoxedQuad, label: '4X+' },
    { value: BoatClass.CoxedFour, label: '4+' },
    { value: BoatClass.Four, label: '4-' },
    { value: BoatClass.Eight, label: '8+' },
    { value: BoatClass.Ergo, label: 'ERGO' },
  ];

  saving = false;
  error: string | null = null;

  constructor(
    private scoringSchemeBoatCoefficientsService: ScoringSchemeBoatCoefficientsService,
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
      boatClass: '',
      coefficient: null,
    };
    this.error = null;
    this.saving = false;
  }

  get isFormValid(): boolean {
    return (
      !!this.formData.boatClass &&
      this.formData.coefficient != null &&
      !!this.scoringSchemeId
    );
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeBoatCoefficientRequest = {
      scoringSchemeId: this.scoringSchemeId,
      boatClass: this.formData.boatClass as BoatClass,
      coefficient: this.formData.coefficient!,
    };

    this.scoringSchemeBoatCoefficientsService
      .createScoringSchemeBoatCoefficient(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err?.error?.message || this.translate.instant('scoring.addCoefficient.createError');
          this.cdr.markForCheck();
        },
      });
  }
}
