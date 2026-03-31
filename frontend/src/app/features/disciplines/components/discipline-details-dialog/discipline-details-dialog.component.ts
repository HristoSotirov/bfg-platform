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
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-discipline-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, CompetitionGroupDetailsDialogComponent],
  templateUrl: './discipline-details-dialog.component.html',
  styleUrl: './discipline-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplineDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() discipline: DisciplineDefinitionDto | null = null;
  @Input() canEdit = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

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

  competitionGroups: CompetitionGroupDefinitionDto[] = [];
  competitionGroupOptions: SearchableSelectOption[] = [];
  loadingGroups = false;

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
    const group = this.competitionGroups.find(
      (g) => g.uuid === this.discipline?.competitionGroupId,
    );
    return group ? `${group.shortName || group.name || '-'} (${group.minAge}-${group.maxAge})` : this.discipline.competitionGroupId;
  }

  // Group preview dialog
  showGroupDialog = false;
  selectedGroup: CompetitionGroupDefinitionDto | null = null;

  navigateToGroup(): void {
    if (!this.discipline?.competitionGroupId) return;
    const group = this.competitionGroups.find(
      (g) => g.uuid === this.discipline?.competitionGroupId,
    );
    if (group) {
      this.selectedGroup = group;
      this.showGroupDialog = true;
      this.cdr.markForCheck();
    }
  }

  closeGroupDialog(): void {
    this.showGroupDialog = false;
    this.selectedGroup = null;
    this.cdr.markForCheck();
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
    this.loadCompetitionGroups();
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  private loadCompetitionGroups(): void {
    this.loadingGroups = true;
    this.cdr.markForCheck();

    this.competitionGroupDefinitionsService
      .getAllCompetitionGroupDefinitions('isActive eq true', undefined, ['name_asc'], 1000, 0)
      .pipe(
        catchError(() => {
          return throwError(() => ({ message: 'Грешка при зареждане на състезателните групи' }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.competitionGroups = response.content || [];
          this.competitionGroupOptions = this.competitionGroups.map((group) => ({
            value: group.uuid || '',
            label: `${group.shortName || group.name || '-'} (${group.minAge}-${group.maxAge})`,
          }));
          this.loadingGroups = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.competitionGroups = [];
          this.competitionGroupOptions = [];
          this.loadingGroups = false;
          this.cdr.markForCheck();
        },
      });
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
    this.competitionGroups = [];
    this.competitionGroupOptions = [];
    this.loadingGroups = false;
    this.showEditingWarningDialog = false;
    this.showDeleteConfirmDialog = false;
    // Load competition groups for display
    this.loadCompetitionGroups();
  }
}
