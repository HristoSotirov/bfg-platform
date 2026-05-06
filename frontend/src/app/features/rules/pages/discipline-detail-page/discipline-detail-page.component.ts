import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, Observable, map, throwError, take } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import {
  DisciplineDefinitionsService,
  DisciplineDefinitionDto,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { DisciplineGender } from '../../../../core/services/api/model/disciplineGender';
import { SystemRole } from '../../../../core/models/navigation.model';
import { AuthService } from '../../../../core/services/auth.service';
import { getBoatClassLabel } from '../../../../shared/utils/boat-class.util';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-discipline-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    CompetitionGroupDetailsDialogComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './discipline-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplineDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  discipline: DisciplineDefinitionDto | null = null;
  loading = true;
  error: string | null = null;

  activeTab = 'details';

  isEditing = false;
  saving = false;
  deleting = false;
  saveError: string | null = null;
  showDeleteConfirmDialog = false;
  deleteError: string | null = null;

  groupLookup: Record<string, string> = {};

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

  touched: Record<string, boolean> = {};

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
    { value: 'SINGLE_SCULL', label: '1X' }, { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' }, { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' }, { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' }, { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' }, { value: 'ERGO', label: 'ERGO' },
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
    { value: 'true', label: this.translate.instant('common.yes') },
    { value: 'false', label: this.translate.instant('common.no') },
  ];

  // Group preview dialog
  showGroupDialog = false;
  selectedGroup: CompetitionGroupDefinitionDto | null = null;
  groupPermalinkRoute: string[] | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.loadDiscipline(uuid);
        this.loadGroupLookup();
      }
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

  get competitionGroupName(): string {
    if (!this.discipline?.competitionGroupId) return '-';
    return this.groupLookup[this.discipline.competitionGroupId] || this.discipline.competitionGroupId;
  }

  private loadDiscipline(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.disciplineDefinitionsService.getDisciplineDefinitionByUuid(uuid)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((discipline) => {
        this.discipline = discipline;
        this.loading = false;
        if (!discipline) this.error = this.translate.instant('common.errorNotFound');
        this.cdr.markForCheck();
      });
  }

  private loadGroupLookup(): void {
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
        undefined, undefined, ['name_asc'] as any, top, skip
      ) as any
    ).pipe(takeUntil(this.destroy$)).subscribe((groups: any[]) => {
      const lookup: Record<string, string> = {};
      groups.forEach((g: any) => {
        lookup[g.uuid] = `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`;
      });
      this.groupLookup = lookup;
      this.cdr.markForCheck();
    });
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('bg-BG'); } catch { return dateStr; }
  }

  openGroupDialog(): void {
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
    this.touched['name'] = true;
    this.touched['shortName'] = true;
    this.touched['distanceMeters'] = true;
    if (!this.discipline?.uuid) return;
    if (!this.isEditFormValid) return;
    this.saving = true;
    this.saveError = null;
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
          let errorMessage = this.translate.instant('common.errorSaving');
          if (err.status === 409) errorMessage = err?.error?.message || 'Конфликт при запазване.';
          else if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updated) => {
          if (updated) this.discipline = updated;
          this.saving = false;
          this.isEditing = false;
          this.saveError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.saveError = err?.message || this.translate.instant('common.errorSaving');
          this.cdr.markForCheck();
        },
      });
  }

  confirmDelete(): void {
    this.showDeleteConfirmDialog = true;
    this.deleteError = null;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteConfirmDialog = false;
    this.deleteError = null;
    this.cdr.markForCheck();
  }

  deleteDiscipline(): void {
    if (!this.discipline?.uuid) return;
    this.deleting = true;
    this.cdr.markForCheck();

    this.disciplineDefinitionsService
      .deleteDisciplineDefinitionByUuid(this.discipline.uuid)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = this.translate.instant('common.errorDeleting');
          if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => { this.location.back(); },
        error: (err) => {
          this.deleting = false;
          this.deleteError = err?.message || this.translate.instant('common.errorDeleting');
          this.cdr.markForCheck();
        },
      });
  }
}
