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
import { RouterModule } from '@angular/router';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import {
  DisciplineDefinitionDto,
  DisciplineDefinitionsService,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { DisciplineGender } from '../../../../core/services/api/model/disciplineGender';
import {
  takeUntil,
  Subject,
  catchError,
  throwError,
  Observable,
  map,
  tap,
  take,
  of,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';
import { getBoatClassLabel } from '../../../../shared/utils/boat-class.util';

@Component({
  selector: 'app-discipline-details-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, RouterModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, DeleteConfirmDialogComponent, CompetitionGroupDetailsDialogComponent],
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
  touched: Record<string, boolean> = {};
  showEditingWarningDialog = false;
  showDeleteConfirmDialog = false;
  deleteError: string | null = null;

  editData = {
    name: '',
    shortName: '',
    gender: '' as string,
    competitionGroupId: '',
    boatClass: '' as string,
    maxCrewFromTransfer: 0,
    isLightweight: false,
    distanceMeters: 2000,
    maxBoatsPerClub: 1,
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

  readonly getBoatClassLabel = getBoatClassLabel;
  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: 'SINGLE_SCULL', label: '1X' },
    { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' },
    { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' },
    { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' },
    { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' },
    { value: 'ERGO', label: 'ERGO' },
  ];

  readonly genderOptions: SearchableSelectOption[] = [
    { value: DisciplineGender.Male, label: this.translate.instant('common.gender.male') },
    { value: DisciplineGender.Female, label: this.translate.instant('common.gender.female') },
    { value: DisciplineGender.Mixed, label: this.translate.instant('common.gender.mixed') },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: this.translate.instant('common.status.active') },
    { value: 'false', label: this.translate.instant('common.status.inactive') },
  ];

  readonly booleanOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Не' },
  ];

  constructor(
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
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
          this.groupPermalinkRoute = this.permalinkRoute ? ['/regulations/groups', group.uuid!] : null;
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
      gender: this.discipline.gender || '',
      competitionGroupId: this.discipline.competitionGroupId || '',
      boatClass: this.discipline.boatClass || '',
      maxCrewFromTransfer: this.discipline.maxCrewFromTransfer ?? 0,
      isLightweight: this.discipline.isLightweight ?? false,
      distanceMeters: this.discipline.distanceMeters ?? 2000,
      maxBoatsPerClub: this.discipline.maxBoatsPerClub ?? 1,
      isActive: this.discipline.isActive ?? true,
    };
    this.isEditing = true;
    this.touched = {};
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.touched = {};
    this.error = null;
    this.cdr.markForCheck();
  }

  get isEditFormValid(): boolean {
    return !!this.editData.name?.trim()
      && !!this.editData.shortName?.trim()
      && !!this.editData.gender
      && !!this.editData.competitionGroupId
      && !!this.editData.boatClass
      && this.editData.distanceMeters != null && this.editData.distanceMeters >= 0;
  }

  onCompetitionGroupChange(value: string | null): void {
    this.editData.competitionGroupId = value || '';
    this.cdr.markForCheck();
  }

  onBoatClassChange(value: string | null): void {
    this.editData.boatClass = value || '';
    this.cdr.markForCheck();
  }

  onGenderChange(value: string | null): void {
    this.editData.gender = value || '';
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    this.editData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  onIsLightweightChange(value: string | null): void {
    this.editData.isLightweight = value === 'true';
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.discipline?.uuid) return;

    this.touched['shortName'] = true;
    this.touched['name'] = true;
    this.touched['distanceMeters'] = true;

    if (!this.isEditFormValid) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: DisciplineDefinitionRequest = {
      name: this.editData.name.trim(),
      shortName: this.editData.shortName.trim(),
      gender: this.editData.gender as DisciplineGender,
      competitionGroupId: this.editData.competitionGroupId,
      boatClass: this.editData.boatClass as BoatClass,
      maxCrewFromTransfer: this.editData.maxCrewFromTransfer,
      isLightweight: this.editData.isLightweight,
      distanceMeters: this.editData.distanceMeters,
      maxBoatsPerClub: this.editData.maxBoatsPerClub,
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
          this.error = err?.message || this.translate.instant('common.errorSaving');
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
    this.deleteError = null;
    this.cdr.markForCheck();
  }

  deleteDiscipline(): void {
    if (!this.discipline?.uuid) return;

    this.deleteError = null;
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
          this.deleteError = errorMessage;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          if (result !== null) {
            this.closeDeleteConfirm();
            this.deleted.emit();
            this.cdr.markForCheck();
          }
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
    this.touched = {};
    this.showEditingWarningDialog = false;
    this.showDeleteConfirmDialog = false;
  }
}
