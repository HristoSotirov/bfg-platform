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
import { Subject, takeUntil, catchError, of, Observable, map, throwError, timeout } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import { DisciplinesTableComponent } from '../../../disciplines/components/disciplines-table/disciplines-table.component';
import { DisciplineDetailsDialogComponent } from '../../../disciplines/components/discipline-details-dialog/discipline-details-dialog.component';
import { AddDisciplineDialogComponent } from '../../../disciplines/components/add-discipline-dialog/add-discipline-dialog.component';
import {
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
  CompetitionGroupDefinitionRequest,
  CompetitionGroupGender,
  TransferRounding,
  DisciplineDefinitionsService,
  DisciplineDefinitionDto,
  DisciplineDefinitionRequest,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { AuthService } from '../../../../core/services/auth.service';
import { getBoatClassLabel, getBoatClassCrewSize, getBoatClassHasCoxswain } from '../../../../shared/utils/boat-class.util';
import { SystemRole } from '../../../../core/models/navigation.model';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-competition-group-detail-page',
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
    DisciplinesTableComponent,
    DisciplineDetailsDialogComponent,
    AddDisciplineDialogComponent,
  ],
  templateUrl: './competition-group-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionGroupDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  group: CompetitionGroupDefinitionDto | null = null;
  loading = true;
  error: string | null = null;

  activeTab: 'details' | 'disciplines' = 'details';

  disciplines: DisciplineDefinitionDto[] = [];
  disciplinesLoading = false;
  disciplinesLoaded = false;
  disciplinesError: string | null = null;
  disciplineDeleteError: string | null = null;

  isEditing = false;
  saving = false;
  deleting = false;
  saveError: string | null = null;
  showDeleteConfirmDialog = false;
  showEditingWarningDialog = false;

  groupLookup: Record<string, string> = {};

  editData: {
    name: string;
    shortName: string;
    gender: CompetitionGroupGender;
    minAge: number | null;
    maxAge: number | null;
    maxDisciplinesPerAthlete: number | null;
    transferFromGroupId: string;
    minCrewForTransfer: number | null;
    transferRatio: number | null;
    transferRounding: TransferRounding | '';
    transferredMaxDisciplinesPerPerson: number | null;
    coxRequiredWeightKg: number | null;
    coxMinWeightKg: number | null;
    lightMaxWeightKg: number | null;
    isActive: boolean;
  } = {
    name: '',
    shortName: '',
    gender: CompetitionGroupGender.Male,
    minAge: null,
    maxAge: null,
    maxDisciplinesPerAthlete: null,
    transferFromGroupId: '',
    minCrewForTransfer: null,
    transferRatio: null,
    transferRounding: '',
    transferredMaxDisciplinesPerPerson: null,
    coxRequiredWeightKg: null,
    coxMinWeightKg: null,
    lightMaxWeightKg: null,
    isActive: true,
  };

  readonly genderOptions: SearchableSelectOption[] = [
    { value: CompetitionGroupGender.Male, label: 'Мъже' },
    { value: CompetitionGroupGender.Female, label: 'Жени' },
    { value: CompetitionGroupGender.Mixed, label: 'Смесени' },
  ];

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

  // Transfer group preview dialog
  showTransferGroupDialog = false;
  transferGroup: CompetitionGroupDefinitionDto | null = null;
  transferGroupPermalinkRoute: string[] | null = null;

  // Discipline detail dialog
  showDisciplineDialog = false;
  selectedDiscipline: DisciplineDefinitionDto | null = null;
  disciplinePermalinkRoute: string[] | null = null;

  isAddDisciplineDialogOpen = false;

  // Inline discipline editing
  editingDisciplineId: string | null = null;
  savingDiscipline = false;
  disciplineToDelete: DisciplineDefinitionDto | null = null;
  showDeleteDisciplineConfirm = false;
  disciplineEditData: {
    name: string;
    shortName: string;
    boatClass: string;
    maxCrewFromTransfer: number | null;
    isLightweight: string;
    distanceMeters: number | null;
    isActive: string;
  } = {
    name: '', shortName: '', boatClass: '',
    maxCrewFromTransfer: null, isLightweight: 'false',
    distanceMeters: null, isActive: 'true',
  };

  readonly getBoatClassLabel = getBoatClassLabel;
  readonly getBoatClassCrewSize = getBoatClassCrewSize;
  readonly getBoatClassHasCoxswain = getBoatClassHasCoxswain;
  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: 'SINGLE_SCULL', label: '1X' }, { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' }, { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' }, { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' }, { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' }, { value: 'ERGO', label: 'ERGO' },
  ];

  readonly booleanOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Да' }, { value: 'false', label: 'Не' },
  ];

  showTransferSchemaDialog = false;

  get hasTransferData(): boolean {
    if (!this.group) return false;
    return (this.group as any).minCrewForTransfer != null
      && (this.group as any).transferRatio != null
      && !!(this.group as any).transferRounding;
  }

  get transferSchemaRows(): { crewSize: number; transferCount: number }[] {
    if (!this.group) return [];
    const minCrew = (this.group as any).minCrewForTransfer;
    const ratio = (this.group as any).transferRatio;
    const rounding = (this.group as any).transferRounding;
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

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      const tab = params.get('tab') as 'details' | 'disciplines' | null;

      if (uuid) {
        const isNewUuid = this.group?.uuid !== uuid;
        if (isNewUuid) {
          this.closeAllDialogs();
          this.loadGroup(uuid);
          this.loadGroupLookup();
        }
        const resolvedTab = tab === 'disciplines' ? 'disciplines' : 'details';
        if (resolvedTab !== this.activeTab) {
          this.activeTab = resolvedTab;
          if (resolvedTab === 'disciplines' && !this.disciplinesLoaded && this.group?.uuid) {
            this.loadDisciplines();
          }
        }
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

  private loadGroup(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.competitionGroupDefinitionsService.getCompetitionGroupDefinitionByUuid(uuid)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((group) => {
        this.group = group;
        this.loading = false;
        if (!group) this.error = 'Групата не е намерена.';
        if (group && this.activeTab === 'disciplines' && !this.disciplinesLoaded) {
          this.loadDisciplines();
        }
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

  goBack(): void {
    this.location.back();
  }

  setTab(tab: 'details' | 'disciplines'): void {
    if (tab === this.activeTab) return;
    this.router.navigate(['/regulations/groups', this.group!.uuid, tab], { replaceUrl: true });
  }

  private loadDisciplines(): void {
    if (!this.group?.uuid) return;
    this.disciplinesLoading = true;
    this.disciplinesError = null;
    this.cdr.markForCheck();
    this.disciplineDefinitionsService.getAllDisciplineDefinitions(
      `competitionGroupId eq '${this.group.uuid}'`, undefined, ['name_asc'] as any, 200, 0
    ).pipe(
      timeout(30000),
      catchError((err) => {
        this.disciplinesError = err?.error?.message || 'Грешка при зареждане';
        this.disciplinesLoading = false;
        this.cdr.markForCheck();
        return of({ content: [], totalElements: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe((response: any) => {
      this.disciplines = response.content || [];
      this.disciplinesLoading = false;
      this.disciplinesLoaded = true;
      this.cdr.markForCheck();
    });
  }

  openAddDisciplineDialog(): void {
    this.isAddDisciplineDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddDisciplineDialog(): void {
    this.isAddDisciplineDialogOpen = false;
    this.cdr.markForCheck();
  }

  onDisciplineAdded(): void {
    this.isAddDisciplineDialogOpen = false;
    this.loadDisciplines();
  }

  startEditingDiscipline(d: DisciplineDefinitionDto): void {
    this.editingDisciplineId = d.uuid!;
    this.disciplineEditData = {
      name: d.name || '',
      shortName: d.shortName || '',
      boatClass: d.boatClass || '',
      maxCrewFromTransfer: d.maxCrewFromTransfer ?? null,
      isLightweight: d.isLightweight ? 'true' : 'false',
      distanceMeters: d.distanceMeters ?? null,
      isActive: d.isActive ? 'true' : 'false',
    };
    this.cdr.markForCheck();
  }

  cancelEditingDiscipline(): void {
    this.editingDisciplineId = null;
    this.cdr.markForCheck();
  }

  saveDiscipline(): void {
    if (!this.editingDisciplineId) return;
    this.savingDiscipline = true;
    this.cdr.markForCheck();
    const request: DisciplineDefinitionRequest = {
      name: this.disciplineEditData.name,
      shortName: this.disciplineEditData.shortName,
      competitionGroupId: this.group!.uuid!,
      boatClass: this.disciplineEditData.boatClass as BoatClass,
      maxCrewFromTransfer: this.disciplineEditData.maxCrewFromTransfer ?? 0,
      isLightweight: this.disciplineEditData.isLightweight === 'true',
      distanceMeters: this.disciplineEditData.distanceMeters ?? 0,
      isActive: this.disciplineEditData.isActive === 'true',
    };
    this.disciplineDefinitionsService
      .updateDisciplineDefinitionByUuid(this.editingDisciplineId, request)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((updated) => {
        this.savingDiscipline = false;
        this.editingDisciplineId = null;
        if (updated) {
          const idx = this.disciplines.findIndex(d => d.uuid === (updated as any).uuid);
          if (idx !== -1) this.disciplines = [...this.disciplines.slice(0, idx), updated as DisciplineDefinitionDto, ...this.disciplines.slice(idx + 1)];
        }
        this.cdr.markForCheck();
      });
  }

  confirmDeleteDiscipline(d: DisciplineDefinitionDto): void {
    this.disciplineToDelete = d;
    this.showDeleteDisciplineConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDeleteDiscipline(): void {
    this.disciplineToDelete = null;
    this.showDeleteDisciplineConfirm = false;
    this.cdr.markForCheck();
  }

  executeDeleteDiscipline(): void {
    if (!this.disciplineToDelete?.uuid) return;
    const uuid = this.disciplineToDelete.uuid;
    this.disciplineDefinitionsService
      .deleteDisciplineDefinitionByUuid(uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.disciplines = this.disciplines.filter(d => d.uuid !== uuid);
          this.disciplineToDelete = null;
          this.showDeleteDisciplineConfirm = false;
          this.disciplineDeleteError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.disciplineDeleteError = err?.error?.message || 'Грешка при изтриване на дисциплина';
          this.disciplineToDelete = null;
          this.showDeleteDisciplineConfirm = false;
          this.cdr.markForCheck();
        },
      });
  }

  openDisciplineDetails(discipline: DisciplineDefinitionDto): void {
    this.selectedDiscipline = discipline;
    this.disciplinePermalinkRoute = ['/regulations/disciplines', discipline.uuid!];
    this.showDisciplineDialog = true;
    this.cdr.markForCheck();
  }

  closeDisciplineDialog(): void {
    this.showDisciplineDialog = false;
    this.selectedDiscipline = null;
    this.disciplinePermalinkRoute = null;
    this.cdr.markForCheck();
  }

  onDisciplineSaved(): void {
    this.loadDisciplines();
  }

  onDisciplineDeleted(): void {
    this.closeDisciplineDialog();
    this.loadDisciplines();
  }

  getGenderLabel(gender: CompetitionGroupGender | undefined): string {
    if (!gender) return '-';
    const labels: Record<string, string> = { MALE: 'Мъже', FEMALE: 'Жени', MIXED: 'Смесени' };
    return labels[gender] ?? gender;
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

  getGroupName(uuid: string | undefined): string {
    if (!uuid) return '-';
    return this.groupLookup[uuid] || uuid;
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch { return dateStr; }
  }

  openTransferGroupDialog(): void {
    if (!this.group?.transferFromGroupId) return;
    this.competitionGroupDefinitionsService
      .getCompetitionGroupDefinitionByUuid(this.group.transferFromGroupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (group) => {
          this.transferGroup = group;
          this.transferGroupPermalinkRoute = ['/regulations/groups', group.uuid!];
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

  closeAllDialogs(): void {
    this.showTransferGroupDialog = false;
    this.transferGroup = null;
    this.transferGroupPermalinkRoute = null;
    this.showDisciplineDialog = false;
    this.selectedDiscipline = null;
    this.disciplinePermalinkRoute = null;
    this.isAddDisciplineDialogOpen = false;
    this.editingDisciplineId = null;
    this.showDeleteDisciplineConfirm = false;
    this.disciplineToDelete = null;
  }

  startEditing(): void {
    if (!this.canEdit || !this.group) return;
    this.editData = {
      name: this.group.name || '',
      shortName: this.group.shortName || '',
      gender: this.group.gender || CompetitionGroupGender.Male,
      minAge: this.group.minAge ?? null,
      maxAge: this.group.maxAge ?? null,
      maxDisciplinesPerAthlete: this.group.maxDisciplinesPerAthlete ?? null,
      transferFromGroupId: this.group.transferFromGroupId || '',
      minCrewForTransfer: this.group.minCrewForTransfer ?? null,
      transferRatio: this.group.transferRatio ?? null,
      transferRounding: this.group.transferRounding || '',
      transferredMaxDisciplinesPerPerson: this.group.transferredMaxDisciplinesPerPerson ?? null,
      coxRequiredWeightKg: this.group.coxRequiredWeightKg ?? null,
      coxMinWeightKg: this.group.coxMinWeightKg ?? null,
      lightMaxWeightKg: this.group.lightMaxWeightKg ?? null,
      isActive: this.group.isActive ?? true,
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.saveError = null;
    this.cdr.markForCheck();
  }

  onGenderChange(value: string | null): void {
    this.editData.gender = (value as CompetitionGroupGender) || CompetitionGroupGender.Male;
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
    this.saveError = null;
    this.cdr.markForCheck();

    const request: CompetitionGroupDefinitionRequest = {
      name: this.editData.name,
      shortName: this.editData.shortName,
      gender: this.editData.gender,
      minAge: this.editData.minAge ?? 0,
      maxAge: this.editData.maxAge ?? 0,
      maxDisciplinesPerAthlete: this.editData.maxDisciplinesPerAthlete ?? 1,
      transferFromGroupId: this.editData.transferFromGroupId || undefined,
      minCrewForTransfer: this.editData.minCrewForTransfer ?? undefined,
      transferRatio: this.editData.transferRatio ?? undefined,
      transferRounding: (this.editData.transferRounding as TransferRounding) || undefined,
      transferredMaxDisciplinesPerPerson: this.editData.transferredMaxDisciplinesPerPerson ?? undefined,
      coxRequiredWeightKg: this.editData.coxRequiredWeightKg ?? undefined,
      coxMinWeightKg: this.editData.coxMinWeightKg ?? undefined,
      lightMaxWeightKg: this.editData.lightMaxWeightKg ?? undefined,
      isActive: this.editData.isActive,
    };

    this.competitionGroupDefinitionsService
      .updateCompetitionGroupDefinitionByUuid(this.group.uuid, request)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 409) {
            errorMessage = err?.error?.message || 'Конфликт при запазване.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedGroup) => {
          if (updatedGroup) this.group = updatedGroup;
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

  deleteGroup(): void {
    if (!this.group?.uuid) return;
    this.deleting = true;
    this.showDeleteConfirmDialog = false;
    this.cdr.markForCheck();

    this.competitionGroupDefinitionsService
      .deleteCompetitionGroupDefinitionByUuid(this.group.uuid)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при изтриване';
          if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.location.back();
        },
        error: (err) => {
          this.deleting = false;
          this.saveError = err?.message || 'Грешка при изтриване';
          this.cdr.markForCheck();
        },
      });
  }
}
