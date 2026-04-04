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
import { AddScoringRuleDialogComponent } from '../add-scoring-rule-dialog/add-scoring-rule-dialog.component';
import { AddBoatCoefficientDialogComponent } from '../add-boat-coefficient-dialog/add-boat-coefficient-dialog.component';
import {
  ScoringSchemeDto,
  ScoringRuleDto,
  ScoringRuleRequest,
  ScoringSchemeBoatCoefficientDto,
  ScoringSchemeBoatCoefficientRequest,
  ScoringSchemesService,
  ScoringRulesService,
  ScoringSchemeBoatCoefficientsService,
  ScoringSchemeRequest,
  ScoringType,
  BoatClass,
} from '../../../../core/services/api';
import { Subject, takeUntil, catchError, of, throwError } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-scoring-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    AddScoringRuleDialogComponent,
    AddBoatCoefficientDialogComponent,
  ],
  templateUrl: './scoring-details-dialog.component.html',
  styleUrl: './scoring-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() scheme: ScoringSchemeDto | null = null;
  @Input() canEdit = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  rules: ScoringRuleDto[] = [];
  coefficients: ScoringSchemeBoatCoefficientDto[] = [];
  loadingRules = false;
  loadingCoefficients = false;

  isEditing = false;
  saving = false;
  error: string | null = null;
  showEditingWarningDialog = false;

  editData = {
    name: '',
    scoringType: ScoringType.Fixed as ScoringType,
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

  isAddRuleDialogOpen = false;
  isAddCoefficientDialogOpen = false;

  showDeleteRuleConfirm = false;
  ruleToDelete: ScoringRuleDto | null = null;

  showDeleteCoefficientConfirm = false;
  coefficientToDelete: ScoringSchemeBoatCoefficientDto | null = null;

  // Inline editing for rules
  editingRuleId: string | null = null;
  ruleEditData = {
    placement: null as number | null,
    basePoints: null as number | null,
  };
  savingRule = false;

  // Inline editing for coefficients
  editingCoefficientId: string | null = null;
  coeffEditData = {
    boatClass: '' as string,
    coefficient: null as number | null,
  };
  savingCoefficient = false;

  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: '1X', label: '1X' },
    { value: '2X', label: '2X' },
    { value: '2+', label: '2+' },
    { value: '2-', label: '2-' },
    { value: '4X', label: '4X' },
    { value: '4X+', label: '4X+' },
    { value: '4+', label: '4+' },
    { value: '4-', label: '4-' },
    { value: '8+', label: '8+' },
    { value: 'ERGO', label: 'ERGO' },
  ];

  private readonly boatClassOrder: Record<string, number> = {
    '1X': 1,
    '2X': 2,
    '2-': 3,
    '2+': 4,
    '4X': 5,
    '4X+': 6,
    '4-': 7,
    '4+': 8,
    '8+': 9,
    'ERGO': 10,
  };

  constructor(
    private scoringSchemesService: ScoringSchemesService,
    private scoringRulesService: ScoringRulesService,
    private scoringSchemeBoatCoefficientsService: ScoringSchemeBoatCoefficientsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.scheme) {
      this.resetState();
      this.loadRules();
      this.loadCoefficients();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    if (this.isEditing || this.editingRuleId || this.editingCoefficientId) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.error = null;
    this.closed.emit();
  }

  getScoringTypeLabel(scoringType: string | undefined): string {
    if (!scoringType) return '-';
    const labels: Record<string, string> = {
      FIXED: 'Фиксирано',
      OFFSET_FROM_END: 'От края',
    };
    return labels[scoringType] ?? scoringType;
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  getBoatClassLabel(boatClass: string | undefined): string {
    return boatClass || '-';
  }

  // --- Rules ---

  private loadRules(): void {
    if (!this.scheme?.uuid) return;

    this.loadingRules = true;
    this.cdr.markForCheck();

    fetchAllPages((skip, top) =>
      this.scoringRulesService.getAllScoringRules(
        `scoringSchemeId eq '${this.scheme!.uuid}'`,
        ['placement_asc'],
        top,
        skip,
      ) as any
    )
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (rules: any[]) => {
          this.rules = rules;
          this.loadingRules = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.rules = [];
          this.loadingRules = false;
          this.cdr.markForCheck();
        },
      });
  }

  openAddRuleDialog(): void {
    this.isAddRuleDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddRuleDialog(): void {
    this.isAddRuleDialogOpen = false;
    this.cdr.markForCheck();
  }

  onRuleAdded(): void {
    this.closeAddRuleDialog();
    this.loadRules();
  }

  confirmDeleteRule(rule: ScoringRuleDto): void {
    if (!rule.uuid) return;
    this.ruleToDelete = rule;
    this.showDeleteRuleConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteRuleConfirm(): void {
    this.showDeleteRuleConfirm = false;
    this.ruleToDelete = null;
    this.cdr.markForCheck();
  }

  deleteRule(): void {
    if (!this.ruleToDelete?.uuid) return;

    const ruleUuid = this.ruleToDelete.uuid;
    this.showDeleteRuleConfirm = false;
    this.error = null;

    this.scoringRulesService
      .deleteScoringRuleByUuid(ruleUuid)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при изтриване на правило';
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.ruleToDelete = null;
          this.loadRules();
        },
      });
  }

  startEditingRule(rule: ScoringRuleDto): void {
    this.editingRuleId = rule.uuid || null;
    this.ruleEditData = {
      placement: rule.placement ?? null,
      basePoints: rule.basePoints ?? null,
    };
    this.cdr.markForCheck();
  }

  cancelEditingRule(): void {
    this.editingRuleId = null;
    this.cdr.markForCheck();
  }

  get isRuleEditValid(): boolean {
    return this.ruleEditData.placement != null && this.ruleEditData.placement > 0 && this.ruleEditData.basePoints != null;
  }

  saveRule(): void {
    if (!this.editingRuleId || !this.scheme?.uuid || !this.isRuleEditValid) return;

    this.savingRule = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringRuleRequest = {
      scoringSchemeId: this.scheme.uuid,
      placement: this.ruleEditData.placement!,
      basePoints: this.ruleEditData.basePoints!,
    };

    this.scoringRulesService
      .updateScoringRuleByUuid(this.editingRuleId, request)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при запазване на правило';
          this.savingRule = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.savingRule = false;
          if (result) {
            this.editingRuleId = null;
            this.loadRules();
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Coefficients ---

  private loadCoefficients(): void {
    if (!this.scheme?.uuid) return;

    this.loadingCoefficients = true;
    this.cdr.markForCheck();

    fetchAllPages((skip, top) =>
      this.scoringSchemeBoatCoefficientsService.getAllScoringSchemeBoatCoefficients(
        `scoringSchemeId eq '${this.scheme!.uuid}'`,
        top,
        skip,
      ) as any
    )
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (coefficients: any[]) => {
          this.coefficients = coefficients.sort((a, b) => {
            const orderA = this.boatClassOrder[a.boatClass || ''] ?? 99;
            const orderB = this.boatClassOrder[b.boatClass || ''] ?? 99;
            return orderA - orderB;
          });
          this.loadingCoefficients = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.coefficients = [];
          this.loadingCoefficients = false;
          this.cdr.markForCheck();
        },
      });
  }

  openAddCoefficientDialog(): void {
    this.isAddCoefficientDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddCoefficientDialog(): void {
    this.isAddCoefficientDialogOpen = false;
    this.cdr.markForCheck();
  }

  onCoefficientAdded(): void {
    this.closeAddCoefficientDialog();
    this.loadCoefficients();
  }

  confirmDeleteCoefficient(coeff: ScoringSchemeBoatCoefficientDto): void {
    if (!coeff.uuid) return;
    this.coefficientToDelete = coeff;
    this.showDeleteCoefficientConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteCoefficientConfirm(): void {
    this.showDeleteCoefficientConfirm = false;
    this.coefficientToDelete = null;
    this.cdr.markForCheck();
  }

  deleteCoefficient(): void {
    if (!this.coefficientToDelete?.uuid) return;

    const coeffUuid = this.coefficientToDelete.uuid;
    this.showDeleteCoefficientConfirm = false;
    this.error = null;

    this.scoringSchemeBoatCoefficientsService
      .deleteScoringSchemeBoatCoefficientByUuid(coeffUuid)
      .pipe(
        catchError((err) => {
          this.error =
            err?.error?.message || 'Грешка при изтриване на коефициент';
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.coefficientToDelete = null;
          this.loadCoefficients();
        },
      });
  }

  startEditingCoefficient(coeff: ScoringSchemeBoatCoefficientDto): void {
    this.editingCoefficientId = coeff.uuid || null;
    this.coeffEditData = {
      boatClass: coeff.boatClass || '',
      coefficient: coeff.coefficient ?? null,
    };
    this.cdr.markForCheck();
  }

  cancelEditingCoefficient(): void {
    this.editingCoefficientId = null;
    this.cdr.markForCheck();
  }

  get isCoeffEditValid(): boolean {
    return !!this.coeffEditData.boatClass && this.coeffEditData.coefficient != null;
  }

  saveCoefficient(): void {
    if (!this.editingCoefficientId || !this.scheme?.uuid || !this.isCoeffEditValid) return;

    this.savingCoefficient = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeBoatCoefficientRequest = {
      scoringSchemeId: this.scheme.uuid,
      boatClass: this.coeffEditData.boatClass as BoatClass,
      coefficient: this.coeffEditData.coefficient!,
    };

    this.scoringSchemeBoatCoefficientsService
      .updateScoringSchemeBoatCoefficientByUuid(this.editingCoefficientId, request)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при запазване на коефициент';
          this.savingCoefficient = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.savingCoefficient = false;
          if (result) {
            this.editingCoefficientId = null;
            this.loadCoefficients();
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Editing scheme ---

  startEditing(): void {
    if (!this.canEdit || !this.scheme) return;

    this.editData = {
      name: this.scheme.name || '',
      scoringType: (this.scheme.scoringType as ScoringType) || ScoringType.Fixed,
      isActive: this.scheme.isActive ?? true,
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.scheme?.uuid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeRequest = {
      name: this.editData.name,
      scoringType: this.editData.scoringType,
      isActive: this.editData.isActive,
    };

    this.scoringSchemesService
      .updateScoringSchemeByUuid(this.scheme.uuid, request)
      .pipe(
        catchError((err) => {
          const errorMessage =
            err?.error?.message || 'Грешка при запазване';
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedScheme) => {
          if (updatedScheme) {
            this.scheme = updatedScheme;
          }
          this.saving = false;
          this.isEditing = false;
          this.error = null;
          this.saved.emit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.message || 'Грешка при запазване';
          this.cdr.markForCheck();
        },
      });
  }

  private resetState(): void {
    this.isEditing = false;
    this.error = null;
    this.saving = false;
    this.rules = [];
    this.coefficients = [];
    this.loadingRules = false;
    this.loadingCoefficients = false;
    this.isAddRuleDialogOpen = false;
    this.isAddCoefficientDialogOpen = false;
    this.showDeleteRuleConfirm = false;
    this.ruleToDelete = null;
    this.showDeleteCoefficientConfirm = false;
    this.coefficientToDelete = null;
    this.showEditingWarningDialog = false;
    this.editingRuleId = null;
    this.savingRule = false;
    this.editingCoefficientId = null;
    this.savingCoefficient = false;
  }
}
