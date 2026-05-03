import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, throwError } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { AddScoringRuleDialogComponent } from '../../../scoring/components/add-scoring-rule-dialog/add-scoring-rule-dialog.component';
import { AddBoatCoefficientDialogComponent } from '../../../scoring/components/add-boat-coefficient-dialog/add-boat-coefficient-dialog.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
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
  SystemRole,
} from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';
import { getBoatClassLabel } from '../../../../shared/utils/boat-class.util';

@Component({
  selector: 'app-scoring-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    AddScoringRuleDialogComponent,
    AddBoatCoefficientDialogComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './scoring-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  scheme: ScoringSchemeDto | null = null;
  loading = true;
  error: string | null = null;
  saveError: string | null = null;

  rules: ScoringRuleDto[] = [];
  coefficients: ScoringSchemeBoatCoefficientDto[] = [];
  loadingRules = false;
  loadingCoefficients = false;

  isEditing = false;
  saving = false;

  editData = {
    name: '',
    scoringType: ScoringType.Fixed as ScoringType,
    isActive: true,
  };

  touched: Record<string, boolean> = {};

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
  deleteRuleError: string | null = null;

  showDeleteCoefficientConfirm = false;
  coefficientToDelete: ScoringSchemeBoatCoefficientDto | null = null;
  deleteCoefficientError: string | null = null;

  editingRuleId: string | null = null;
  ruleEditData = { placement: null as number | null, basePoints: null as number | null };
  savingRule = false;

  editingCoefficientId: string | null = null;
  coeffEditData = { boatClass: '' as string, coefficient: null as number | null };
  savingCoefficient = false;

  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: 'SINGLE_SCULL', label: '1X' }, { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' }, { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' }, { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' }, { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' }, { value: 'ERGO', label: 'ERGO' },
  ];

  readonly getBoatClassLabel = getBoatClassLabel;
  private readonly boatClassOrder: Record<string, number> = {
    'SINGLE_SCULL': 1, 'DOUBLE_SCULL': 2, 'PAIR': 3, 'COXED_PAIR': 4, 'QUAD': 5, 'COXED_QUAD': 6, 'FOUR': 7, 'COXED_FOUR': 8, 'EIGHT': 9, 'ERGO': 10,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private scoringSchemesService: ScoringSchemesService,
    private scoringRulesService: ScoringRulesService,
    private scoringSchemeBoatCoefficientsService: ScoringSchemeBoatCoefficientsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) this.loadScheme(uuid);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    const user = this.authService.currentUser;
    if (!user) return false;
    return user.roles.some(r => r === SystemRole.AppAdmin || r === SystemRole.FederationAdmin);
  }

  get isRuleEditValid(): boolean {
    return this.ruleEditData.placement != null && this.ruleEditData.placement > 0 && this.ruleEditData.basePoints != null;
  }

  get isCoeffEditValid(): boolean {
    return !!this.coeffEditData.boatClass && this.coeffEditData.coefficient != null;
  }

  private loadScheme(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.scoringSchemesService.getScoringSchemeByUuid(uuid)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((scheme) => {
        this.scheme = scheme;
        this.loading = false;
        if (!scheme) { this.error = 'Схемата не е намерена.'; this.cdr.markForCheck(); return; }
        this.loadRules();
        this.loadCoefficients();
        this.cdr.markForCheck();
      });
  }

  private loadRules(): void {
    if (!this.scheme?.uuid) return;
    this.loadingRules = true;
    this.cdr.markForCheck();
    fetchAllPages((skip, top) =>
      this.scoringRulesService.getAllScoringRules(
        `scoringSchemeId eq '${this.scheme!.uuid}'`, ['placement_asc'], top, skip
      ) as any
    ).pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe((rules: any[]) => {
        this.rules = rules;
        this.loadingRules = false;
        this.cdr.markForCheck();
      });
  }

  private loadCoefficients(): void {
    if (!this.scheme?.uuid) return;
    this.loadingCoefficients = true;
    this.cdr.markForCheck();
    fetchAllPages((skip, top) =>
      this.scoringSchemeBoatCoefficientsService.getAllScoringSchemeBoatCoefficients(
        `scoringSchemeId eq '${this.scheme!.uuid}'`, top, skip
      ) as any
    ).pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe((coefficients: any[]) => {
        this.coefficients = coefficients.sort((a, b) =>
          (this.boatClassOrder[a.boatClass || ''] ?? 99) - (this.boatClassOrder[b.boatClass || ''] ?? 99)
        );
        this.loadingCoefficients = false;
        this.cdr.markForCheck();
      });
  }

  getScoringTypeLabel(scoringType: string | undefined): string {
    if (!scoringType) return '-';
    return { FIXED: 'Фиксирано', OFFSET_FROM_END: 'От края' }[scoringType] ?? scoringType;
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('bg-BG'); } catch { return dateStr; }
  }

  startEditing(): void {
    if (!this.canEdit || !this.scheme) return;
    this.editData = {
      name: this.scheme.name || '',
      scoringType: (this.scheme.scoringType as ScoringType) || ScoringType.Fixed,
      isActive: this.scheme.isActive ?? true,
    };
    this.touched = {};
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.saveError = null;
    this.touched = {};
    this.cdr.markForCheck();
  }

  get isEditFormValid(): boolean {
    return !!this.editData.name?.trim()
      && !!this.editData.scoringType;
  }

  save(): void {
    this.touched['name'] = true;
    if (!this.scheme?.uuid) return;
    if (!this.isEditFormValid) return;
    this.saving = true;
    this.saveError = null;
    this.cdr.markForCheck();

    const request: ScoringSchemeRequest = {
      name: this.editData.name.trim(),
      scoringType: this.editData.scoringType,
      isActive: this.editData.isActive,
    };

    this.scoringSchemesService.updateScoringSchemeByUuid(this.scheme.uuid, request)
      .pipe(
        catchError((err) => throwError(() => ({ message: err?.error?.message || 'Грешка при запазване' }))),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updated) => {
          if (updated) this.scheme = updated;
          this.saving = false;
          this.isEditing = false;
          this.saveError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.saveError = err?.message || 'Грешка при запазване';
          this.cdr.markForCheck();
        },
      });
  }

  // Rules
  openAddRuleDialog(): void { this.isAddRuleDialogOpen = true; this.cdr.markForCheck(); }
  closeAddRuleDialog(): void { this.isAddRuleDialogOpen = false; this.cdr.markForCheck(); }
  onRuleAdded(): void { this.closeAddRuleDialog(); this.loadRules(); }

  confirmDeleteRule(rule: ScoringRuleDto): void {
    this.ruleToDelete = rule;
    this.showDeleteRuleConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteRuleConfirm(): void {
    this.showDeleteRuleConfirm = false;
    this.ruleToDelete = null;
    this.deleteRuleError = null;
    this.cdr.markForCheck();
  }

  deleteRule(): void {
    if (!this.ruleToDelete?.uuid) return;
    const uuid = this.ruleToDelete.uuid;
    this.deleteRuleError = null;
    this.scoringRulesService.deleteScoringRuleByUuid(uuid)
      .pipe(catchError((err) => { this.deleteRuleError = err?.error?.message || 'Грешка при изтриване'; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { if (result !== null) { this.closeDeleteRuleConfirm(); this.loadRules(); } });
  }

  startEditingRule(rule: ScoringRuleDto): void {
    this.editingRuleId = rule.uuid || null;
    this.ruleEditData = { placement: rule.placement ?? null, basePoints: rule.basePoints ?? null };
    this.cdr.markForCheck();
  }

  cancelEditingRule(): void { this.editingRuleId = null; this.cdr.markForCheck(); }

  saveRule(): void {
    if (!this.editingRuleId || !this.scheme?.uuid || !this.isRuleEditValid) return;
    this.savingRule = true;
    this.cdr.markForCheck();
    const request: ScoringRuleRequest = { scoringSchemeId: this.scheme.uuid, placement: this.ruleEditData.placement!, basePoints: this.ruleEditData.basePoints! };
    this.scoringRulesService.updateScoringRuleByUuid(this.editingRuleId, request)
      .pipe(catchError((err) => { this.saveError = err?.error?.message || 'Грешка'; this.savingRule = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingRule = false; if (result) { this.editingRuleId = null; this.loadRules(); } this.cdr.markForCheck(); });
  }

  // Coefficients
  openAddCoefficientDialog(): void { this.isAddCoefficientDialogOpen = true; this.cdr.markForCheck(); }
  closeAddCoefficientDialog(): void { this.isAddCoefficientDialogOpen = false; this.cdr.markForCheck(); }
  onCoefficientAdded(): void { this.closeAddCoefficientDialog(); this.loadCoefficients(); }

  confirmDeleteCoefficient(coeff: ScoringSchemeBoatCoefficientDto): void {
    this.coefficientToDelete = coeff;
    this.showDeleteCoefficientConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteCoefficientConfirm(): void {
    this.showDeleteCoefficientConfirm = false;
    this.coefficientToDelete = null;
    this.deleteCoefficientError = null;
    this.cdr.markForCheck();
  }

  deleteCoefficient(): void {
    if (!this.coefficientToDelete?.uuid) return;
    const uuid = this.coefficientToDelete.uuid;
    this.deleteCoefficientError = null;
    this.scoringSchemeBoatCoefficientsService.deleteScoringSchemeBoatCoefficientByUuid(uuid)
      .pipe(catchError((err) => { this.deleteCoefficientError = err?.error?.message || 'Грешка при изтриване'; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { if (result !== null) { this.closeDeleteCoefficientConfirm(); this.loadCoefficients(); } });
  }

  startEditingCoefficient(coeff: ScoringSchemeBoatCoefficientDto): void {
    this.editingCoefficientId = coeff.uuid || null;
    this.coeffEditData = { boatClass: coeff.boatClass || '', coefficient: coeff.coefficient ?? null };
    this.cdr.markForCheck();
  }

  cancelEditingCoefficient(): void { this.editingCoefficientId = null; this.cdr.markForCheck(); }

  saveCoefficient(): void {
    if (!this.editingCoefficientId || !this.scheme?.uuid || !this.isCoeffEditValid) return;
    this.savingCoefficient = true;
    this.cdr.markForCheck();
    const request: ScoringSchemeBoatCoefficientRequest = { scoringSchemeId: this.scheme.uuid, boatClass: this.coeffEditData.boatClass as BoatClass, coefficient: this.coeffEditData.coefficient! };
    this.scoringSchemeBoatCoefficientsService.updateScoringSchemeBoatCoefficientByUuid(this.editingCoefficientId, request)
      .pipe(catchError((err) => { this.saveError = err?.error?.message || 'Грешка'; this.savingCoefficient = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingCoefficient = false; if (result) { this.editingCoefficientId = null; this.loadCoefficients(); } this.cdr.markForCheck(); });
  }

  // ===== DELETE SCHEME =====
  showDeleteSchemeConfirm = false;
  deleteSchemeError: string | null = null;
  deletingScheme = false;

  confirmDeleteScheme(): void {
    this.showDeleteSchemeConfirm = true;
    this.deleteSchemeError = null;
    this.cdr.markForCheck();
  }

  cancelDeleteScheme(): void {
    this.showDeleteSchemeConfirm = false;
    this.deleteSchemeError = null;
    this.cdr.markForCheck();
  }

  deleteScheme(): void {
    if (!this.scheme?.uuid) return;
    this.deletingScheme = true;
    this.cdr.markForCheck();
    this.scoringSchemesService.deleteScoringSchemeByUuid(this.scheme.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/regulations/scoring']);
        },
        error: (err) => {
          this.deletingScheme = false;
          this.deleteSchemeError = err?.error?.message || 'Грешка при изтриване на схема за точкуване';
          this.cdr.markForCheck();
        },
      });
  }
}
