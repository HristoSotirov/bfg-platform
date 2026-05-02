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
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import {
  QualificationSchemeDto,
  QualificationSchemeRequest,
  QualificationSchemesService,
  QualificationTierDto,
  QualificationTierRequest,
  QualificationTiersService,
  QualificationProgressionDto,
  QualificationProgressionRequest,
  QualificationProgressionsService,
  SystemRole,
} from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

interface TierWithProgressions {
  tier: QualificationTierDto;
  progressions: QualificationProgressionDto[];
  expanded: boolean;
}

@Component({
  selector: 'app-qualification-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './qualification-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  scheme: QualificationSchemeDto | null = null;
  loading = true;
  error: string | null = null;
  saveError: string | null = null;

  tierGroups: TierWithProgressions[] = [];
  loadingTiers = false;

  isEditing = false;
  saving = false;

  editData = { name: '', laneCount: 0, isActive: true };

  isAddTierDialogOpen = false;
  addTierError: string | null = null;
  addTierData = {
    boatCountMin: null as number | null,
    boatCountMax: null as number | null,
    heatCount: null as number | null,
    semiFinalCount: null as number | null,
    finalBCount: null as number | null,
    finalACount: null as number | null,
  };
  savingTier = false;

  showDeleteTierConfirm = false;
  tierToDelete: QualificationTierDto | null = null;
  deleteTierError: string | null = null;

  editingTierId: string | null = null;
  tierEditData = {
    boatCountMin: null as number | null,
    boatCountMax: null as number | null,
    heatCount: null as number | null,
    semiFinalCount: null as number | null,
    finalBCount: null as number | null,
    finalACount: null as number | null,
  };
  savingTierEdit = false;

  editingProgressionId: string | null = null;
  progressionEditData = { sourceEvent: '', destEvent: '', qualifyByPosition: null as number | null, qualifyByTime: null as number | null };
  savingProgression = false;

  showDeleteProgressionConfirm = false;
  progressionToDelete: QualificationProgressionDto | null = null;
  deleteProgressionError: string | null = null;

  addingProgressionForTierId: string | null = null;
  addProgressionData = { sourceEvent: '', destEvent: '', qualifyByPosition: null as number | null, qualifyByTime: null as number | null };
  savingNewProgression = false;

  readonly eventTypeLabels: Record<string, string> = { H: 'Серии', SF: 'Полуфинали', FB: 'Финал Б', FA: 'Финал А' };
  private readonly eventOrder: Record<string, number> = { H: 1, SF: 2, FB: 3, FA: 4 };

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private schemesService: QualificationSchemesService,
    private tiersService: QualificationTiersService,
    private progressionsService: QualificationProgressionsService,
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

  get isAddTierValid(): boolean {
    return (
      this.addTierData.boatCountMin != null && this.addTierData.boatCountMax != null &&
      this.addTierData.heatCount != null && this.addTierData.semiFinalCount != null &&
      this.addTierData.finalBCount != null && this.addTierData.finalACount != null &&
      this.addTierData.finalACount >= 1
    );
  }

  get isTierEditValid(): boolean {
    return (
      this.tierEditData.boatCountMin != null && this.tierEditData.boatCountMax != null &&
      this.tierEditData.heatCount != null && this.tierEditData.semiFinalCount != null &&
      this.tierEditData.finalBCount != null && this.tierEditData.finalACount != null &&
      this.tierEditData.finalACount >= 1
    );
  }

  get isProgressionEditValid(): boolean {
    return !!(this.progressionEditData.sourceEvent && this.progressionEditData.destEvent &&
      this.progressionEditData.qualifyByPosition != null && this.progressionEditData.qualifyByTime != null);
  }

  get isAddProgressionValid(): boolean {
    return !!(this.addProgressionData.sourceEvent && this.addProgressionData.destEvent &&
      this.addProgressionData.qualifyByPosition != null && this.addProgressionData.qualifyByTime != null);
  }

  private loadScheme(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.schemesService.getQualificationSchemeByUuid(uuid)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((scheme) => {
        this.scheme = scheme;
        this.loading = false;
        if (!scheme) { this.error = 'Схемата не е намерена.'; this.cdr.markForCheck(); return; }
        this.loadTiers();
        this.cdr.markForCheck();
      });
  }

  private loadTiers(): void {
    if (!this.scheme?.uuid) return;
    this.loadingTiers = true;
    this.cdr.markForCheck();
    fetchAllPages((skip, top) =>
      this.tiersService.getAllQualificationTiers(
        `qualificationSchemeId eq '${this.scheme!.uuid}'`, ['boatCountMin_asc'], top, skip
      ) as any
    ).pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe((tiers: any[]) => {
        const previouslyExpanded = new Set(this.tierGroups.filter(g => g.expanded).map(g => g.tier.uuid));
        this.tierGroups = tiers.map(t => ({ tier: t, progressions: [], expanded: previouslyExpanded.has(t.uuid) }));
        this.loadingTiers = false;
        this.cdr.markForCheck();
        tiers.forEach((tier, i) => { if (tier.uuid) this.loadProgressionsForTier(tier.uuid, i); });
      });
  }

  private loadProgressionsForTier(tierId: string, index: number): void {
    fetchAllPages((skip, top) =>
      this.progressionsService.getAllQualificationProgressions(
        `qualificationTierId eq '${tierId}'`, ['createdAt_asc'], top, skip
      ) as any
    ).pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe((progressions: any[]) => {
        if (this.tierGroups[index]) {
          this.tierGroups[index].progressions = progressions.sort((a, b) => {
            const sa = this.eventOrder[a.sourceEvent || ''] ?? 99;
            const sb = this.eventOrder[b.sourceEvent || ''] ?? 99;
            if (sa !== sb) return sa - sb;
            return (this.eventOrder[a.destEvent || ''] ?? 99) - (this.eventOrder[b.destEvent || ''] ?? 99);
          });
          this.cdr.markForCheck();
        }
      });
  }

  getTierDescription(group: TierWithProgressions): string {
    const tier = group.tier;
    if (!tier.heatCount && !tier.semiFinalCount) return '→ ФА';
    const parts: string[] = [];
    const progressions = group.progressions;
    if (tier.heatCount && tier.heatCount > 0) {
      const heatProgs = progressions.filter(p => p.sourceEvent === 'H');
      const heatDesc = heatProgs.map(p => {
        const dest = this.eventTypeLabels[p.destEvent || ''] || p.destEvent;
        if (p.qualifyByPosition === 0 && p.qualifyByTime === 0) return `ост→${dest}`;
        let s = `${p.qualifyByPosition}п`;
        if (p.qualifyByTime && p.qualifyByTime > 0) s += `+${p.qualifyByTime}в`;
        return `${s}→${dest}`;
      }).join(', ');
      parts.push(`${tier.heatCount} С(${heatDesc || '...'})`);
    }
    if (tier.semiFinalCount && tier.semiFinalCount > 0) {
      const sfProgs = progressions.filter(p => p.sourceEvent === 'SF');
      const sfDesc = sfProgs.map(p => {
        const dest = this.eventTypeLabels[p.destEvent || ''] || p.destEvent;
        return `${p.qualifyByPosition}→${dest}`;
      }).join(', ');
      parts.push(`${tier.semiFinalCount} ПФ(${sfDesc || '...'})`);
    }
    if (tier.finalBCount && tier.finalBCount > 0) parts.push('ФБ');
    return parts.join(' · ');
  }

  toggleTierExpand(index: number): void {
    this.tierGroups[index].expanded = !this.tierGroups[index].expanded;
    this.cdr.markForCheck();
  }

  getSourceOptions(tier: QualificationTierDto): SearchableSelectOption[] {
    const options: SearchableSelectOption[] = [];
    if (tier.heatCount && tier.heatCount > 0) options.push({ value: 'H', label: 'Серии (H)' });
    if (tier.semiFinalCount && tier.semiFinalCount > 0) options.push({ value: 'SF', label: 'Полуфинали (SF)' });
    return options;
  }

  getDestOptions(tier: QualificationTierDto): SearchableSelectOption[] {
    const options: SearchableSelectOption[] = [];
    if (tier.semiFinalCount && tier.semiFinalCount > 0) options.push({ value: 'SF', label: 'Полуфинали (SF)' });
    if (tier.finalACount && tier.finalACount > 0) options.push({ value: 'FA', label: 'Финал А (FA)' });
    if (tier.finalBCount && tier.finalBCount > 0) options.push({ value: 'FB', label: 'Финал Б (FB)' });
    return options;
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('bg-BG'); } catch { return dateStr; }
  }

  getEventLabel(event: string | undefined): string {
    if (!event) return '-';
    return this.eventTypeLabels[event] ?? event;
  }

  startEditing(): void {
    if (!this.canEdit || !this.scheme) return;
    this.editData = { name: this.scheme.name || '', laneCount: this.scheme.laneCount || 0, isActive: this.scheme.isActive ?? true };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.saveError = null;
    this.cdr.markForCheck();
  }

  saveScheme(): void {
    if (!this.scheme?.uuid) return;
    this.saving = true;
    this.saveError = null;
    this.cdr.markForCheck();
    const request: QualificationSchemeRequest = { name: this.editData.name, laneCount: this.editData.laneCount, isActive: this.editData.isActive };
    this.schemesService.updateQualificationSchemeByUuid(this.scheme.uuid, request)
      .pipe(catchError((err) => throwError(() => ({ message: err?.error?.message || 'Грешка при запазване' }))), takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => { if (updated) this.scheme = updated; this.saving = false; this.isEditing = false; this.saveError = null; this.cdr.markForCheck(); },
        error: (err) => { this.saving = false; this.saveError = err?.message || 'Грешка при запазване'; this.cdr.markForCheck(); },
      });
  }

  openAddTierDialog(): void {
    const laneCount = this.scheme?.laneCount || 7;
    const existing = this.tierGroups.length;
    this.addTierData = {
      boatCountMin: existing === 0 ? 1 : (existing * laneCount) + 1,
      boatCountMax: (existing + 1) * laneCount,
      heatCount: null, semiFinalCount: null, finalBCount: null, finalACount: null,
    };
    this.isAddTierDialogOpen = true;
    this.savingTier = false;
    this.cdr.markForCheck();
  }

  closeAddTierDialog(): void { this.isAddTierDialogOpen = false; this.addTierError = null; this.cdr.markForCheck(); }

  saveTier(): void {
    if (!this.scheme?.uuid || !this.isAddTierValid) return;
    this.savingTier = true;
    this.addTierError = null;
    this.cdr.markForCheck();
    const request: QualificationTierRequest = {
      qualificationSchemeId: this.scheme.uuid,
      boatCountMin: this.addTierData.boatCountMin!, boatCountMax: this.addTierData.boatCountMax!,
      heatCount: this.addTierData.heatCount!, semiFinalCount: this.addTierData.semiFinalCount!,
      finalBCount: this.addTierData.finalBCount!, finalACount: this.addTierData.finalACount!,
    };
    this.tiersService.createQualificationTier(request)
      .pipe(catchError((err) => { this.addTierError = err?.error?.message || 'Грешка'; this.savingTier = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingTier = false; if (result) { this.closeAddTierDialog(); this.loadTiers(); } this.cdr.markForCheck(); });
  }

  confirmDeleteTier(tier: QualificationTierDto): void { this.tierToDelete = tier; this.showDeleteTierConfirm = true; this.cdr.markForCheck(); }
  closeDeleteTierConfirm(): void { this.showDeleteTierConfirm = false; this.tierToDelete = null; this.deleteTierError = null; this.cdr.markForCheck(); }
  deleteTier(): void {
    if (!this.tierToDelete?.uuid) return;
    this.deleteTierError = null;
    this.tiersService.deleteQualificationTierByUuid(this.tierToDelete.uuid)
      .pipe(catchError((err) => { this.deleteTierError = err?.error?.message || 'Грешка при изтриване'; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { if (result !== null) { this.closeDeleteTierConfirm(); this.loadTiers(); this.cdr.markForCheck(); } });
  }

  startEditingTier(tier: QualificationTierDto): void {
    this.editingTierId = tier.uuid || null;
    this.tierEditData = { boatCountMin: tier.boatCountMin ?? null, boatCountMax: tier.boatCountMax ?? null, heatCount: tier.heatCount ?? null, semiFinalCount: tier.semiFinalCount ?? null, finalBCount: tier.finalBCount ?? null, finalACount: tier.finalACount ?? null };
    this.cdr.markForCheck();
  }
  cancelEditingTier(): void { this.editingTierId = null; this.cdr.markForCheck(); }

  saveTierEdit(): void {
    if (!this.editingTierId || !this.scheme?.uuid || !this.isTierEditValid) return;
    this.savingTierEdit = true;
    this.cdr.markForCheck();
    const request: QualificationTierRequest = {
      qualificationSchemeId: this.scheme.uuid,
      boatCountMin: this.tierEditData.boatCountMin!, boatCountMax: this.tierEditData.boatCountMax!,
      heatCount: this.tierEditData.heatCount!, semiFinalCount: this.tierEditData.semiFinalCount!,
      finalBCount: this.tierEditData.finalBCount!, finalACount: this.tierEditData.finalACount!,
    };
    this.tiersService.updateQualificationTierByUuid(this.editingTierId, request)
      .pipe(catchError((err) => { this.saveError = err?.error?.message || 'Грешка'; this.savingTierEdit = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingTierEdit = false; if (result) { this.editingTierId = null; this.loadTiers(); } this.cdr.markForCheck(); });
  }

  startEditingProgression(prog: QualificationProgressionDto): void {
    this.editingProgressionId = prog.uuid || null;
    this.progressionEditData = { sourceEvent: prog.sourceEvent || '', destEvent: prog.destEvent || '', qualifyByPosition: prog.qualifyByPosition ?? null, qualifyByTime: prog.qualifyByTime ?? null };
    this.cdr.markForCheck();
  }
  cancelEditingProgression(): void { this.editingProgressionId = null; this.cdr.markForCheck(); }

  saveProgression(tierId: string): void {
    if (!this.editingProgressionId || !this.isProgressionEditValid) return;
    this.savingProgression = true;
    this.cdr.markForCheck();
    const request: QualificationProgressionRequest = {
      qualificationTierId: tierId,
      sourceEvent: this.progressionEditData.sourceEvent, destEvent: this.progressionEditData.destEvent,
      qualifyByPosition: this.progressionEditData.qualifyByPosition!, qualifyByTime: this.progressionEditData.qualifyByTime!,
    };
    this.progressionsService.updateQualificationProgressionByUuid(this.editingProgressionId, request)
      .pipe(catchError((err) => { this.saveError = err?.error?.message || 'Грешка'; this.savingProgression = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingProgression = false; if (result) { this.editingProgressionId = null; this.loadTiers(); } this.cdr.markForCheck(); });
  }

  confirmDeleteProgression(prog: QualificationProgressionDto): void { this.progressionToDelete = prog; this.showDeleteProgressionConfirm = true; this.cdr.markForCheck(); }
  closeDeleteProgressionConfirm(): void { this.showDeleteProgressionConfirm = false; this.progressionToDelete = null; this.deleteProgressionError = null; this.cdr.markForCheck(); }
  deleteProgression(): void {
    if (!this.progressionToDelete?.uuid) return;
    this.deleteProgressionError = null;
    this.progressionsService.deleteQualificationProgressionByUuid(this.progressionToDelete.uuid)
      .pipe(catchError((err) => { this.deleteProgressionError = err?.error?.message || 'Грешка при изтриване'; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { if (result !== null) { this.closeDeleteProgressionConfirm(); this.loadTiers(); this.cdr.markForCheck(); } });
  }

  startAddingProgression(tierId: string): void {
    this.addingProgressionForTierId = tierId;
    this.addProgressionData = { sourceEvent: '', destEvent: '', qualifyByPosition: null, qualifyByTime: null };
    this.cdr.markForCheck();
  }
  cancelAddingProgression(): void { this.addingProgressionForTierId = null; this.cdr.markForCheck(); }

  saveNewProgression(): void {
    if (!this.addingProgressionForTierId || !this.isAddProgressionValid) return;
    this.savingNewProgression = true;
    this.cdr.markForCheck();
    const request: QualificationProgressionRequest = {
      qualificationTierId: this.addingProgressionForTierId,
      sourceEvent: this.addProgressionData.sourceEvent, destEvent: this.addProgressionData.destEvent,
      qualifyByPosition: this.addProgressionData.qualifyByPosition!, qualifyByTime: this.addProgressionData.qualifyByTime!,
    };
    this.progressionsService.createQualificationProgression(request)
      .pipe(catchError((err) => { this.saveError = err?.error?.message || 'Грешка'; this.savingNewProgression = false; this.cdr.markForCheck(); return of(null); }), takeUntil(this.destroy$))
      .subscribe((result) => { this.savingNewProgression = false; if (result) { this.addingProgressionForTierId = null; this.loadTiers(); } this.cdr.markForCheck(); });
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
    this.schemesService.deleteQualificationSchemeByUuid(this.scheme.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/regulations/qualification']);
        },
        error: (err) => {
          this.deletingScheme = false;
          this.deleteSchemeError = err?.error?.message || 'Грешка при изтриване на квалификационна схема';
          this.cdr.markForCheck();
        },
      });
  }
}
