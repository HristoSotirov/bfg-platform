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
import { RouterModule } from '@angular/router';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import {
  CompetitionGroupDefinitionDto,
  CompetitionGroupDefinitionRequest,
  CompetitionGroupDefinitionsService,
  TransferRounding,
} from '../../../../core/services/api';
import { takeUntil, Subject, catchError, throwError, Observable, map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-competition-group-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './competition-group-details-dialog.component.html',
  styleUrl: './competition-group-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionGroupDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() group: CompetitionGroupDefinitionDto | null = null;
  @Input() canEdit = false;
  @Input() groupMap: Record<string, string> = {};
  @Input() permalinkRoute: string[] | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() navigated = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  isEditing = false;
  saving = false;
  deleting = false;
  error: string | null = null;
  showEditingWarningDialog = false;
  showDeleteConfirmDialog = false;
  showTransferSchemaDialog = false;

  get transferSchemaRows(): { crewSize: number; transferCount: number }[] {
    const group = this.isEditing ? this.editData : this.group;
    if (!group) return [];

    const minCrew = (group as any).minCrewForTransfer;
    const ratio = (group as any).transferRatio;
    const rounding = (group as any).transferRounding;

    if (minCrew == null || ratio == null || !rounding) return [];

    const rows: { crewSize: number; transferCount: number }[] = [];
    for (let size = 1; size <= 15; size++) {
      let count = 0;
      if (size >= minCrew) {
        const raw = size * ratio / 100;
        switch (rounding) {
          case 'FLOOR': count = Math.floor(raw); break;
          case 'CEIL': count = Math.ceil(raw); break;
          case 'ROUND': count = Math.round(raw); break;
          default: count = Math.round(raw);
        }
      }
      rows.push({ crewSize: size, transferCount: count });
    }
    return rows;
  }

  get hasTransferData(): boolean {
    const group = this.isEditing ? this.editData : this.group;
    if (!group) return false;
    return (group as any).minCrewForTransfer != null && (group as any).transferRatio != null && !!(group as any).transferRounding;
  }
  groupSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService
        .getAllCompetitionGroupDefinitions(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((groups: any[]) => [
      { value: '', label: 'Няма' },
      ...groups.map((g: any) => ({
        value: g.uuid || '',
        label: `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`,
        disabled: !g.isActive,
      })),
    ]));

  editData: {
    name: string;
    shortName: string;
    minAge: number | null;
    maxAge: number | null;
    coxMinAge: number | null;
    coxMaxAge: number | null;
    maxDisciplinesPerAthlete: number | null;
    transferFromGroupId: string;
    minCrewForTransfer: number | null;
    transferRatio: number | null;
    transferRounding: TransferRounding | '';
    transferredMaxDisciplinesPerAthlete: number | null;
    maleTeamCoxRequiredWeightKg: number | null;
    maleTeamCoxMinWeightKg: number | null;
    maleTeamLightMaxWeightKg: number | null;
    femaleTeamCoxRequiredWeightKg: number | null;
    femaleTeamCoxMinWeightKg: number | null;
    femaleTeamLightMaxWeightKg: number | null;
    isActive: boolean;
  } = {
    name: '',
    shortName: '',
    minAge: null,
    maxAge: null,
    coxMinAge: null,
    coxMaxAge: null,
    maxDisciplinesPerAthlete: null,
    transferFromGroupId: '',
    minCrewForTransfer: null,
    transferRatio: null,
    transferRounding: '',
    transferredMaxDisciplinesPerAthlete: null,
    maleTeamCoxRequiredWeightKg: null,
    maleTeamCoxMinWeightKg: null,
    maleTeamLightMaxWeightKg: null,
    femaleTeamCoxRequiredWeightKg: null,
    femaleTeamCoxMinWeightKg: null,
    femaleTeamLightMaxWeightKg: null,
    isActive: true,
  };

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  readonly roundingOptions: SearchableSelectOption[] = [
    { value: '', label: 'Няма' },
    { value: TransferRounding.Floor, label: 'Закръгляне надолу (FLOOR)' },
    { value: TransferRounding.Ceil, label: 'Закръгляне нагоре (CEIL)' },
    { value: TransferRounding.Round, label: 'Закръгляне (ROUND)' },
  ];

  constructor(
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.group) {
      this.resetState();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  getRoundingLabel(rounding: TransferRounding | undefined): string {
    if (!rounding) return '-';
    const labels: Record<string, string> = {
      FLOOR: 'Закръгляне надолу',
      CEIL: 'Закръгляне нагоре',
      ROUND: 'Закръгляне',
    };
    return labels[rounding] ?? rounding;
  }

  close(): void {
    if (this.isEditing) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.error = null;
    this.closed.emit();
  }

  onPermalinkClick(): void {
    this.error = null;
    this.isEditing = false;
    this.closed.emit();
    this.navigated.emit();
  }


  getGroupName(uuid: string | undefined): string {
    if (!uuid) return '-';
    return this.groupMap[uuid] || uuid;
  }

  // Transfer group preview
  showTransferGroupDialog = false;
  transferGroup: CompetitionGroupDefinitionDto | null = null;
  transferGroupPermalinkRoute: string[] | null = null;

  openTransferGroupDialog(): void {
    if (!this.group?.transferFromGroupId) return;
    this.competitionGroupDefinitionsService
      .getCompetitionGroupDefinitionByUuid(this.group.transferFromGroupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (group) => {
          this.transferGroup = group;
          this.transferGroupPermalinkRoute = this.permalinkRoute ? ['/regulations/groups', group.uuid!] : null;
          this.showTransferGroupDialog = true;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  closeTransferGroupDialog(): void {
    this.showTransferGroupDialog = false;
    this.transferGroup = null;
    this.transferGroupPermalinkRoute = null;
    this.cdr.markForCheck();
  }

  onTransferGroupPermalinkClick(): void {
    this.closeTransferGroupDialog();
    this.error = null;
    this.isEditing = false;
    this.closed.emit();
    this.navigated.emit();
  }

  startEditing(): void {
    if (!this.canEdit || !this.group) return;

    this.editData = {
      name: this.group.name || '',
      shortName: this.group.shortName || '',
      minAge: this.group.minAge ?? null,
      maxAge: this.group.maxAge ?? null,
      coxMinAge: this.group.coxMinAge ?? null,
      coxMaxAge: this.group.coxMaxAge ?? null,
      maxDisciplinesPerAthlete: this.group.maxDisciplinesPerAthlete ?? null,
      transferFromGroupId: this.group.transferFromGroupId || '',
      minCrewForTransfer: this.group.minCrewForTransfer ?? null,
      transferRatio: this.group.transferRatio ?? null,
      transferRounding: this.group.transferRounding || '',
      transferredMaxDisciplinesPerAthlete: this.group.transferredMaxDisciplinesPerAthlete ?? null,
      maleTeamCoxRequiredWeightKg: this.group.maleTeamCoxRequiredWeightKg ?? null,
      maleTeamCoxMinWeightKg: this.group.maleTeamCoxMinWeightKg ?? null,
      maleTeamLightMaxWeightKg: this.group.maleTeamLightMaxWeightKg ?? null,
      femaleTeamCoxRequiredWeightKg: this.group.femaleTeamCoxRequiredWeightKg ?? null,
      femaleTeamCoxMinWeightKg: this.group.femaleTeamCoxMinWeightKg ?? null,
      femaleTeamLightMaxWeightKg: this.group.femaleTeamLightMaxWeightKg ?? null,
      isActive: this.group.isActive ?? true,
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    this.editData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  onRoundingChange(value: string | null): void {
    this.editData.transferRounding = (value as TransferRounding | '') || '';
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.group?.uuid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: CompetitionGroupDefinitionRequest = {
      name: this.editData.name,
      shortName: this.editData.shortName,
      minAge: this.editData.minAge ?? 0,
      maxAge: this.editData.maxAge ?? 0,
      coxMinAge: this.editData.coxMinAge ?? undefined,
      coxMaxAge: this.editData.coxMaxAge ?? undefined,
      maxDisciplinesPerAthlete: this.editData.maxDisciplinesPerAthlete ?? 1,
      transferFromGroupId: this.editData.transferFromGroupId || undefined,
      minCrewForTransfer: this.editData.minCrewForTransfer ?? undefined,
      transferRatio: this.editData.transferRatio ?? undefined,
      transferRounding: (this.editData.transferRounding as TransferRounding) || undefined,
      transferredMaxDisciplinesPerAthlete: this.editData.transferredMaxDisciplinesPerAthlete ?? undefined,
      maleTeamCoxRequiredWeightKg: this.editData.maleTeamCoxRequiredWeightKg ?? undefined,
      maleTeamCoxMinWeightKg: this.editData.maleTeamCoxMinWeightKg ?? undefined,
      maleTeamLightMaxWeightKg: this.editData.maleTeamLightMaxWeightKg ?? undefined,
      femaleTeamCoxRequiredWeightKg: this.editData.femaleTeamCoxRequiredWeightKg ?? undefined,
      femaleTeamCoxMinWeightKg: this.editData.femaleTeamCoxMinWeightKg ?? undefined,
      femaleTeamLightMaxWeightKg: this.editData.femaleTeamLightMaxWeightKg ?? undefined,
      isActive: this.editData.isActive,
    };

    this.competitionGroupDefinitionsService
      .updateCompetitionGroupDefinitionByUuid(this.group.uuid, request)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Групата не е намерена.';
          } else if (err.status === 409) {
            errorMessage =
              err?.error?.message ||
              'Конфликт при запазване. Моля, опитайте отново.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedGroup) => {
          if (updatedGroup) {
            this.group = updatedGroup;
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

  confirmDelete(): void {
    this.showDeleteConfirmDialog = true;
    this.cdr.markForCheck();
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirmDialog = false;
    this.cdr.markForCheck();
  }

  deleteGroup(): void {
    if (!this.group?.uuid) return;

    this.deleting = true;
    this.error = null;
    this.showDeleteConfirmDialog = false;
    this.cdr.markForCheck();

    this.competitionGroupDefinitionsService
      .deleteCompetitionGroupDefinitionByUuid(this.group.uuid)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при изтриване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Групата не е намерена.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.deleting = false;
          this.deleted.emit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.deleting = false;
          this.error = err?.message || 'Грешка при изтриване';
          this.cdr.markForCheck();
        },
      });
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

  private resetState(): void {
    this.isEditing = false;
    this.error = null;
    this.saving = false;
    this.deleting = false;
    this.showEditingWarningDialog = false;
    this.showDeleteConfirmDialog = false;
  }
}
