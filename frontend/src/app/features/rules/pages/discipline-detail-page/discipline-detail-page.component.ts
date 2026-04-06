import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, Observable, map, throwError, take } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import {
  DisciplineDefinitionsService,
  DisciplineDefinitionDto,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { AuthService } from '../../../../core/services/auth.service';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-discipline-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    CompetitionGroupDetailsDialogComponent,
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

  groupLookup: Record<string, string> = {};

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
    { value: '1X', label: '1X' }, { value: '2X', label: '2X' },
    { value: '2+', label: '2+' }, { value: '2-', label: '2-' },
    { value: '4X', label: '4X' }, { value: '4X+', label: '4X+' },
    { value: '4+', label: '4+' }, { value: '4-', label: '4-' },
    { value: '8+', label: '8+' }, { value: 'ERGO', label: 'ERGO' },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  readonly booleanOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Не' },
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
    return user.roles.some(r => r === 'APP_ADMIN' || r === 'FEDERATION_ADMIN');
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
        if (!discipline) this.error = 'Дисциплината не е намерена.';
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
    this.saveError = null;
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
    this.saveError = null;
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
          this.saveError = err?.message || 'Грешка при запазване';
          this.cdr.markForCheck();
        },
      });
  }

  confirmDelete(): void {
    this.showDeleteConfirmDialog = true;
    this.cdr.markForCheck();
  }

  deleteDiscipline(): void {
    if (!this.discipline?.uuid) return;
    this.deleting = true;
    this.showDeleteConfirmDialog = false;
    this.cdr.markForCheck();

    this.disciplineDefinitionsService
      .deleteDisciplineDefinitionByUuid(this.discipline.uuid)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при изтриване';
          if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => { this.location.back(); },
        error: (err) => {
          this.deleting = false;
          this.saveError = err?.message || 'Грешка при изтриване';
          this.cdr.markForCheck();
        },
      });
  }
}
