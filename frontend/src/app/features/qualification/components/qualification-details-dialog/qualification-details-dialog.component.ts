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
  QualificationSchemeDto,
  QualificationSchemeRequest,
  QualificationSchemesService,
  QualificationTierDto,
  QualificationTierRequest,
  QualificationTiersService,
  QualificationProgressionDto,
  QualificationProgressionRequest,
  QualificationProgressionsService,
} from '../../../../core/services/api';
import { Subject, takeUntil, catchError, of, throwError } from 'rxjs';

interface TierWithProgressions {
  tier: QualificationTierDto;
  progressions: QualificationProgressionDto[];
  expanded: boolean;
}

@Component({
  selector: 'app-qualification-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
  ],
  templateUrl: './qualification-details-dialog.component.html',
  styleUrl: './qualification-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() scheme: QualificationSchemeDto | null = null;
  @Input() canEdit = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  tierGroups: TierWithProgressions[] = [];
  loadingTiers = false;

  isEditing = false;
  saving = false;
  error: string | null = null;
  showEditingWarningDialog = false;

  editData = {
    name: '',
    laneCount: 0,
    isActive: true,
  };

  // Add tier dialog
  isAddTierDialogOpen = false;
  addTierData = {
    boatCountMin: null as number | null,
    boatCountMax: null as number | null,
    heatCount: null as number | null,
    semiFinalCount: null as number | null,
    finalBCount: null as number | null,
    finalACount: null as number | null,
  };
  savingTier = false;

  // Delete tier
  showDeleteTierConfirm = false;
  tierToDelete: QualificationTierDto | null = null;

  // Inline editing for progressions
  editingProgressionId: string | null = null;
  progressionEditData = {
    sourceEvent: '',
    destEvent: '',
    qualifyByPosition: null as number | null,
    qualifyByTime: null as number | null,
  };
  savingProgression = false;

  // Delete progression
  showDeleteProgressionConfirm = false;
  progressionToDelete: QualificationProgressionDto | null = null;

  // Add progression
  addingProgressionForTierId: string | null = null;
  addProgressionData = {
    sourceEvent: '',
    destEvent: '',
    qualifyByPosition: null as number | null,
    qualifyByTime: null as number | null,
  };
  savingNewProgression = false;

  readonly eventTypeLabels: Record<string, string> = {
    H: 'Серии',
    SF: 'Полуфинали',
    FB: 'Финал Б',
    FA: 'Финал А',
  };

  private readonly eventOrder: Record<string, number> = {
    H: 1,
    SF: 2,
    FB: 3,
    FA: 4,
  };

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  constructor(
    private schemesService: QualificationSchemesService,
    private tiersService: QualificationTiersService,
    private progressionsService: QualificationProgressionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.scheme) {
      this.resetState();
      this.loadTiers();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    if (this.isEditing || this.editingProgressionId || this.addingProgressionForTierId || this.isAddTierDialogOpen) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.error = null;
    this.closed.emit();
  }

  // --- Load tiers + progressions ---

  private loadTiers(): void {
    if (!this.scheme?.uuid) return;

    this.loadingTiers = true;
    this.cdr.markForCheck();

    this.tiersService
      .getAllQualificationTiers(
        `qualificationSchemeId eq '${this.scheme.uuid}'`,
        ['boatCountMin_asc'],
        100,
        0,
      )
      .pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          const tiers = response.content || [];
          const previouslyExpanded = new Set(
            this.tierGroups.filter(g => g.expanded).map(g => g.tier.uuid)
          );
          this.tierGroups = tiers.map(t => ({
            tier: t,
            progressions: [],
            expanded: previouslyExpanded.has(t.uuid),
          }));
          this.loadingTiers = false;
          this.cdr.markForCheck();
          // Load progressions for each tier
          tiers.forEach((tier, i) => {
            if (tier.uuid) {
              this.loadProgressionsForTier(tier.uuid, i);
            }
          });
        },
        error: () => {
          this.tierGroups = [];
          this.loadingTiers = false;
          this.cdr.markForCheck();
        },
      });
  }

  private loadProgressionsForTier(tierId: string, index: number): void {
    this.progressionsService
      .getAllQualificationProgressions(
        `qualificationTierId eq '${tierId}'`,
        ['createdAt_asc'],
        100,
        0,
      )
      .pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          if (this.tierGroups[index]) {
            this.tierGroups[index].progressions = (response.content || []).sort((a, b) => {
              const sourceA = this.eventOrder[a.sourceEvent || ''] ?? 99;
              const sourceB = this.eventOrder[b.sourceEvent || ''] ?? 99;
              if (sourceA !== sourceB) return sourceA - sourceB;
              const destA = this.eventOrder[a.destEvent || ''] ?? 99;
              const destB = this.eventOrder[b.destEvent || ''] ?? 99;
              return destA - destB;
            });
            this.cdr.markForCheck();
          }
        },
      });
  }

  // --- Tier description ---

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

  // --- Source/Dest options for a tier ---

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

  // --- Editing scheme ---

  startEditing(): void {
    if (!this.canEdit || !this.scheme) return;
    this.editData = {
      name: this.scheme.name || '',
      laneCount: this.scheme.laneCount || 0,
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

  saveScheme(): void {
    if (!this.scheme?.uuid) return;
    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: QualificationSchemeRequest = {
      name: this.editData.name,
      laneCount: this.editData.laneCount,
      isActive: this.editData.isActive,
    };

    this.schemesService
      .updateQualificationSchemeByUuid(this.scheme.uuid, request)
      .pipe(
        catchError((err) => throwError(() => ({ message: err?.error?.message || 'Грешка при запазване' }))),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedScheme) => {
          if (updatedScheme) this.scheme = updatedScheme;
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

  // --- Add tier ---

  openAddTierDialog(): void {
    const laneCount = this.scheme?.laneCount || 7;
    const existingTiers = this.tierGroups.length;
    this.addTierData = {
      boatCountMin: existingTiers === 0 ? 1 : (existingTiers * laneCount) + 1,
      boatCountMax: (existingTiers + 1) * laneCount,
      heatCount: null,
      semiFinalCount: null,
      finalBCount: null,
      finalACount: null,
    };
    this.isAddTierDialogOpen = true;
    this.savingTier = false;
    this.cdr.markForCheck();
  }

  closeAddTierDialog(): void {
    this.isAddTierDialogOpen = false;
    this.cdr.markForCheck();
  }

  get isAddTierValid(): boolean {
    return (
      this.addTierData.boatCountMin != null &&
      this.addTierData.boatCountMax != null &&
      this.addTierData.heatCount != null &&
      this.addTierData.semiFinalCount != null &&
      this.addTierData.finalBCount != null &&
      this.addTierData.finalACount != null &&
      this.addTierData.finalACount >= 1
    );
  }

  saveTier(): void {
    if (!this.scheme?.uuid || !this.isAddTierValid) return;
    this.savingTier = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: QualificationTierRequest = {
      qualificationSchemeId: this.scheme.uuid,
      boatCountMin: this.addTierData.boatCountMin!,
      boatCountMax: this.addTierData.boatCountMax!,
      heatCount: this.addTierData.heatCount!,
      semiFinalCount: this.addTierData.semiFinalCount!,
      finalBCount: this.addTierData.finalBCount!,
      finalACount: this.addTierData.finalACount!,
    };

    this.tiersService
      .createQualificationTier(request)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при създаване на диапазон';
          this.savingTier = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.savingTier = false;
          if (result) {
            this.closeAddTierDialog();
            this.loadTiers();
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Delete tier ---

  confirmDeleteTier(tier: QualificationTierDto): void {
    this.tierToDelete = tier;
    this.showDeleteTierConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteTierConfirm(): void {
    this.showDeleteTierConfirm = false;
    this.tierToDelete = null;
    this.cdr.markForCheck();
  }

  deleteTier(): void {
    if (!this.tierToDelete?.uuid) return;
    this.tiersService
      .deleteQualificationTierByUuid(this.tierToDelete.uuid)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при изтриване на диапазон';
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.closeDeleteTierConfirm();
          this.loadTiers();
          this.cdr.markForCheck();
        },
      });
  }

  // --- Edit progression inline ---

  startEditingProgression(prog: QualificationProgressionDto): void {
    this.editingProgressionId = prog.uuid || null;
    this.progressionEditData = {
      sourceEvent: prog.sourceEvent || '',
      destEvent: prog.destEvent || '',
      qualifyByPosition: prog.qualifyByPosition ?? null,
      qualifyByTime: prog.qualifyByTime ?? null,
    };
    this.cdr.markForCheck();
  }

  cancelEditingProgression(): void {
    this.editingProgressionId = null;
    this.cdr.markForCheck();
  }

  get isProgressionEditValid(): boolean {
    return !!(
      this.progressionEditData.sourceEvent &&
      this.progressionEditData.destEvent &&
      this.progressionEditData.qualifyByPosition != null &&
      this.progressionEditData.qualifyByTime != null
    );
  }

  saveProgression(tierId: string): void {
    if (!this.editingProgressionId || !this.isProgressionEditValid) return;
    this.savingProgression = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: QualificationProgressionRequest = {
      qualificationTierId: tierId,
      sourceEvent: this.progressionEditData.sourceEvent,
      destEvent: this.progressionEditData.destEvent,
      qualifyByPosition: this.progressionEditData.qualifyByPosition!,
      qualifyByTime: this.progressionEditData.qualifyByTime!,
    };

    this.progressionsService
      .updateQualificationProgressionByUuid(this.editingProgressionId, request)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при запазване на правило';
          this.savingProgression = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.savingProgression = false;
          if (result) {
            this.editingProgressionId = null;
            this.loadTiers();
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Delete progression ---

  confirmDeleteProgression(prog: QualificationProgressionDto): void {
    this.progressionToDelete = prog;
    this.showDeleteProgressionConfirm = true;
    this.cdr.markForCheck();
  }

  closeDeleteProgressionConfirm(): void {
    this.showDeleteProgressionConfirm = false;
    this.progressionToDelete = null;
    this.cdr.markForCheck();
  }

  deleteProgression(): void {
    if (!this.progressionToDelete?.uuid) return;
    this.progressionsService
      .deleteQualificationProgressionByUuid(this.progressionToDelete.uuid)
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
          this.closeDeleteProgressionConfirm();
          this.loadTiers();
          this.cdr.markForCheck();
        },
      });
  }

  // --- Add progression to a tier ---

  startAddingProgression(tierId: string): void {
    this.addingProgressionForTierId = tierId;
    this.addProgressionData = {
      sourceEvent: '',
      destEvent: '',
      qualifyByPosition: null,
      qualifyByTime: null,
    };
    this.cdr.markForCheck();
  }

  cancelAddingProgression(): void {
    this.addingProgressionForTierId = null;
    this.cdr.markForCheck();
  }

  get isAddProgressionValid(): boolean {
    return !!(
      this.addProgressionData.sourceEvent &&
      this.addProgressionData.destEvent &&
      this.addProgressionData.qualifyByPosition != null &&
      this.addProgressionData.qualifyByTime != null
    );
  }

  saveNewProgression(): void {
    if (!this.addingProgressionForTierId || !this.isAddProgressionValid) return;
    this.savingNewProgression = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: QualificationProgressionRequest = {
      qualificationTierId: this.addingProgressionForTierId,
      sourceEvent: this.addProgressionData.sourceEvent,
      destEvent: this.addProgressionData.destEvent,
      qualifyByPosition: this.addProgressionData.qualifyByPosition!,
      qualifyByTime: this.addProgressionData.qualifyByTime!,
    };

    this.progressionsService
      .createQualificationProgression(request)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при създаване на правило';
          this.savingNewProgression = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.savingNewProgression = false;
          if (result) {
            this.addingProgressionForTierId = null;
            this.loadTiers();
          }
          this.cdr.markForCheck();
        },
      });
  }

  // --- Helpers ---

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  getEventLabel(event: string | undefined): string {
    if (!event) return '-';
    return this.eventTypeLabels[event] ?? event;
  }

  private resetState(): void {
    this.isEditing = false;
    this.error = null;
    this.saving = false;
    this.tierGroups = [];
    this.loadingTiers = false;
    this.isAddTierDialogOpen = false;
    this.showDeleteTierConfirm = false;
    this.tierToDelete = null;
    this.editingProgressionId = null;
    this.savingProgression = false;
    this.showDeleteProgressionConfirm = false;
    this.progressionToDelete = null;
    this.addingProgressionForTierId = null;
    this.savingNewProgression = false;
    this.showEditingWarningDialog = false;
  }
}
