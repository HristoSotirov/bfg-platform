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
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import {
  DisciplineDefinitionDto,
  DisciplineDefinitionsService,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import {
  takeUntil,
  Subject,
  catchError,
  throwError,
  Observable,
  map,
  tap,
  take,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-discipline-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, CompetitionGroupDetailsDialogComponent],
  templateUrl: './discipline-details-dialog.component.html',
  styleUrl: './discipline-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplineDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() discipline: DisciplineDefinitionDto | null = null;
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

  editData = {
    name: '',
    shortName: '',
    competitionGroupId: '',
    boatClass: '' as string,
    crewSize: 1,
    maxCrewFromTransfer: 0,
    hasCoxswain: false,
    isLightweight: false,
    distanceMeters: 2000,
    isActive: true,
  };

  groupSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService
        .getAllCompetitionGroupDefinitions(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((groups: any[]) => groups.map((g: any) => ({
      value: g.uuid || '',
      label: `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`,
      disabled: !g.isActive,
    }))));

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

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  readonly booleanOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Не' },
  ];

  constructor(
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.discipline) {
      this.resetState();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  get competitionGroupName(): string {
    if (!this.discipline?.competitionGroupId) return '-';
    return this.groupMap[this.discipline.competitionGroupId] || this.discipline.competitionGroupId;
  }

  // Group preview dialog
  showGroupDialog = false;
  selectedGroup: CompetitionGroupDefinitionDto | null = null;
  groupPermalinkRoute: string[] | null = null;

  navigateToGroup(): void {
    if (!this.discipline?.competitionGroupId) return;
    this.competitionGroupDefinitionsService
      .getCompetitionGroupDefinitionByUuid(this.discipline.competitionGroupId)
      .pipe(take(1))
      .subscribe({
        next: (group) => {
          this.selectedGroup = group;
          this.groupPermalinkRoute = ['/regulations/groups', group.uuid!];
          this.showGroupDialog = true;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  closeGroupDialog(): void {
    this.showGroupDialog = false;
    this.selectedGroup = null;
    this.groupPermalinkRoute = null;
    this.cdr.markForCheck();
  }

  onGroupDialogNavigated(): void {
    this.closeGroupDialog();
    this.error = null;
    this.isEditing = false;
    this.closed.emit();
    this.navigated.emit();
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

  startEditing(): void {
    if (!this.canEdit || !this.discipline) return;

    this.editData = {
      name: this.discipline.name || '',
      shortName: this.discipline.shortName || '',
      competitionGroupId: this.discipline.competitionGroupId || '',
      boatClass: this.discipline.boatClass || '',
      crewSize: this.discipline.crewSize ?? 1,
      maxCrewFromTransfer: this.discipline.maxCrewFromTransfer ?? 0,
      hasCoxswain: this.discipline.hasCoxswain ?? false,
      isLightweight: this.discipline.isLightweight ?? false,
      distanceMeters: this.discipline.distanceMeters ?? 2000,
      isActive: this.discipline.isActive ?? true,
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  onCompetitionGroupChange(value: string | null): void {
    this.editData.competitionGroupId = value || '';
    this.cdr.markForCheck();
  }

  onBoatClassChange(value: string | null): void {
    this.editData.boatClass = value || '';
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    this.editData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  onHasCoxswainChange(value: string | null): void {
    this.editData.hasCoxswain = value === 'true';
    this.cdr.markForCheck();
  }

  onIsLightweightChange(value: string | null): void {
    this.editData.isLightweight = value === 'true';
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.discipline?.uuid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: DisciplineDefinitionRequest = {
      name: this.editData.name,
      shortName: this.editData.shortName,
      competitionGroupId: this.editData.competitionGroupId,
      boatClass: this.editData.boatClass as BoatClass,
      crewSize: this.editData.crewSize,
      maxCrewFromTransfer: this.editData.maxCrewFromTransfer,
      hasCoxswain: this.editData.hasCoxswain,
      isLightweight: this.editData.isLightweight,
      distanceMeters: this.editData.distanceMeters,
      isActive: this.editData.isActive,
    };

    this.disciplineDefinitionsService
      .updateDisciplineDefinitionByUuid(this.discipline.uuid, request)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Дисциплината не е намерена.';
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
        next: (updatedDiscipline) => {
          if (updatedDiscipline) {
            this.discipline = updatedDiscipline;
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

  deleteDiscipline(): void {
    if (!this.discipline?.uuid) return;

    this.deleting = true;
    this.error = null;
    this.showDeleteConfirmDialog = false;
    this.cdr.markForCheck();

    this.disciplineDefinitionsService
      .deleteDisciplineDefinitionByUuid(this.discipline.uuid)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при изтриване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Дисциплината не е намерена.';
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
