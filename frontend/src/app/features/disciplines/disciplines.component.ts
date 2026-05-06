import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { DisciplineDefinitionsService, CompetitionGroupDefinitionsService } from '../../core/services/api';
import { DisciplineDefinitionDto } from '../../core/services/api';
import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { SystemRole } from '../../core/models/navigation.model';
import { DisciplinesTableComponent } from './components/disciplines-table/disciplines-table.component';
import { DisciplineDetailsDialogComponent } from './components/discipline-details-dialog/discipline-details-dialog.component';
import { AddDisciplineDialogComponent } from './components/add-discipline-dialog/add-discipline-dialog.component';
import { DisciplinesSettingsDialogComponent } from './components/disciplines-settings-dialog/disciplines-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DisciplinesFiltersComponent } from './components/disciplines-filters/disciplines-filters.component';
import { DropdownOption } from '../../shared/components/multi-select-dropdown/multi-select-dropdown.component';

export interface DisciplineColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface DisciplineFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}
export interface DisciplineFilters {
  search: string;
  boatClasses: string[];
  statuses: string[];
  competitionGroupIds: string[];
}

@Component({
  selector: 'app-disciplines',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    DisciplinesTableComponent,
    DisciplineDetailsDialogComponent,
    AddDisciplineDialogComponent,
    DisciplinesSettingsDialogComponent,
    ButtonComponent,
    DisciplinesFiltersComponent,
  ],
  templateUrl: './disciplines.component.html',
  styleUrl: './disciplines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplinesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  disciplines: DisciplineDefinitionDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  groupMap: Record<string, string> = {};
  groupOptions: DropdownOption[] = [];

  userRole: SystemRole | null = null;

  filters: DisciplineFilters = {
    search: '',
    boatClasses: [],
    statuses: [],
    competitionGroupIds: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: DisciplineColumnConfig[] = [];

  filterConfigs: DisciplineFilterConfig[] = [];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  selectedDiscipline: DisciplineDefinitionDto | null = null;

  constructor(
    private authService: AuthService,
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initTranslatedLabels();
    this.translate.onLangChange.subscribe(() => {
      this.initTranslatedLabels();
      this.cdr.markForCheck();
    });
    this.loadSettings();
    this.initializeUserContext();
    this.loadGroupMap();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['disciplineId']) {
        this.openDisciplineById(params['disciplineId']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGroupMap(): void {
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
        undefined, undefined, ['shortName_asc'] as any, top, skip
      ) as any
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (groups: any[]) => {
        this.groupMap = {};
        this.groupOptions = [];
        for (const g of groups) {
          this.groupMap[g.uuid] = `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`;
          this.groupOptions.push({ value: g.uuid, label: g.shortName || g.name || '-' });
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  get canAddDiscipline(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get canEditDiscipline(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (!user || user.roles.length === 0) {
      this.loadDisciplines();
      return;
    }

    this.userRole = user.roles[0] as SystemRole;
    this.loadDisciplines();
  }

  loadDisciplines(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.disciplines = [];
      this.hasMore = true;
    }

    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

    if (this.filters.boatClasses.length > 0 && this.isFilterVisible('boatClass')) {
      if (this.filters.boatClasses.length === 1) {
        filterParts.push(`boatClass eq '${this.filters.boatClasses[0]}'`);
      } else {
        const boatClassConditions = this.filters.boatClasses
          .map((b) => `boatClass eq '${b}'`)
          .join(' or ');
        filterParts.push(`(${boatClassConditions})`);
      }
    }

    if (this.filters.statuses.length > 0 && this.isFilterVisible('status')) {
      if (this.filters.statuses.length === 1) {
        filterParts.push(`isActive eq ${this.filters.statuses[0]}`);
      } else {
        const statusConditions = this.filters.statuses
          .map((s) => `isActive eq ${s}`)
          .join(' or ');
        filterParts.push(`(${statusConditions})`);
      }
    }

    if (this.filters.competitionGroupIds.length > 0 && this.isFilterVisible('competitionGroup')) {
      if (this.filters.competitionGroupIds.length === 1) {
        filterParts.push(`competitionGroupId eq '${this.filters.competitionGroupIds[0]}'`);
      } else {
        const groupConditions = this.filters.competitionGroupIds
          .map((id) => `competitionGroupId eq '${id}'`)
          .join(' or ');
        filterParts.push(`(${groupConditions})`);
      }
    }

    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    this.disciplineDefinitionsService
      .getAllDisciplineDefinitions(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        this.pageSize,
        this.currentSkip,
      )
      .pipe(
        timeout(30000),
        catchError((err) => {
          this.error = err?.error?.message || this.translate.instant('common.errorLoading');
          this.loading = false;
          return of({ content: [], totalElements: 0 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          if (reset) {
            this.disciplines = response.content || [];
          } else {
            this.disciplines = [...this.disciplines, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.disciplines.length < this.totalElements;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message || this.translate.instant('common.errorLoading');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadMore(): void {
    if (!this.hasMore || this.loading) return;
    this.currentSkip += this.pageSize;
    this.loadDisciplines(false);
  }

  onFiltersChange(filters: DisciplineFilters): void {
    this.filters = { ...filters };
    this.saveFilters();
    this.loadDisciplines();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters();
    this.loadDisciplines();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters();
    this.loadDisciplines();
  }

  openDetailsDialog(discipline: DisciplineDefinitionDto): void {
    this.selectedDiscipline = discipline;
    this.isDetailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  private openDisciplineById(uuid: string): void {
    this.disciplineDefinitionsService
      .getDisciplineDefinitionByUuid(uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (discipline) => {
          this.openDetailsDialog(discipline);
        },
      });
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedDiscipline = null;
    this.cdr.markForCheck();
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
    this.cdr.markForCheck();
  }

  openSettingsDialog(): void {
    this.isSettingsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeSettingsDialog(): void {
    this.isSettingsDialogOpen = false;
    this.cdr.markForCheck();
  }

  onSettingsChange(data: {
    columns: DisciplineColumnConfig[];
    filterConfigs: DisciplineFilterConfig[];
  }): void {
    this.columns = data.columns;
    this.filterConfigs = data.filterConfigs;
    this.saveColumnSettings();
    this.cdr.markForCheck();
  }

  onDisciplineSaved(): void {
    if (this.selectedDiscipline?.uuid) {
      this.disciplineDefinitionsService
        .getDisciplineDefinitionByUuid(this.selectedDiscipline.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedDiscipline) => {
            this.selectedDiscipline = updatedDiscipline;
            this.cdr.markForCheck();
          },
          error: () => {},
        });
    }
    this.loadDisciplines();
  }

  onDisciplineDeleted(): void {
    this.closeDetailsDialog();
    this.loadDisciplines();
  }

  onDisciplineAdded(): void {
    this.loadDisciplines();
    this.closeAddDialog();
  }

  private initTranslatedLabels(): void {
    this.columns = [
      { id: 'name', label: this.translate.instant('disciplines.table.columns.name'), visible: true },
      { id: 'shortName', label: this.translate.instant('disciplines.table.columns.shortName'), visible: true },
      { id: 'competitionGroup', label: this.translate.instant('disciplines.table.columns.competitionGroup'), visible: true },
      { id: 'boatClass', label: this.translate.instant('disciplines.table.columns.boatClass'), visible: true },
      { id: 'crewSize', label: this.translate.instant('disciplines.table.columns.crewSize'), visible: true },
      { id: 'maxCrewFromTransfer', label: this.translate.instant('disciplines.table.columns.maxCrewFromTransfer'), visible: true },
      { id: 'hasCoxswain', label: this.translate.instant('disciplines.table.columns.hasCoxswain'), visible: true },
      { id: 'isLightweight', label: this.translate.instant('disciplines.table.columns.isLightweight'), visible: true },
      { id: 'distanceMeters', label: this.translate.instant('disciplines.table.columns.distanceMeters'), visible: true },
      { id: 'isActive', label: this.translate.instant('disciplines.table.columns.isActive'), visible: true },
      { id: 'createdAt', label: this.translate.instant('disciplines.table.columns.createdAt'), visible: true },
      { id: 'modifiedAt', label: this.translate.instant('disciplines.table.columns.modifiedAt'), visible: true },
    ];
    this.filterConfigs = [
      { id: 'competitionGroup', label: this.translate.instant('disciplines.filterConfigs.competitionGroup'), visible: true },
      { id: 'boatClass', label: this.translate.instant('disciplines.filterConfigs.boatClass'), visible: true },
      { id: 'status', label: this.translate.instant('disciplines.filterConfigs.status'), visible: true },
    ];
    this.loadSettings();
  }

  private saveSettings(): void {
    localStorage.setItem('disciplines_columns', JSON.stringify(this.columns));
    localStorage.setItem(
      'disciplines_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveColumnSettings(): void {
    localStorage.setItem('disciplines_columns', JSON.stringify(this.columns));
    localStorage.setItem(
      'disciplines_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem(
      'disciplines_filterValues',
      JSON.stringify(this.filters),
    );
    localStorage.setItem(
      'disciplines_orderBy',
      JSON.stringify(this.orderBy),
    );
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('disciplines_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find(
            (p: DisciplineColumnConfig) => p.id === col.id,
          );
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem(
      'disciplines_filterConfigs',
    );
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find(
            (p: DisciplineFilterConfig) => p.id === f.id,
          );
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter config settings:', e);
      }
    }

    this.loadFilters();
  }

  private loadFilters(): void {
    const savedFilters = localStorage.getItem('disciplines_filterValues');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filters = {
          search: parsed.search || '',
          boatClasses: parsed.boatClasses || [],
          statuses: parsed.statuses || [],
          competitionGroupIds: parsed.competitionGroupIds || [],
        };
      } catch (e) {
        console.error('Error loading filter values:', e);
      }
    }

    const savedOrderBy = localStorage.getItem('disciplines_orderBy');
    if (savedOrderBy) {
      try {
        const parsed = JSON.parse(savedOrderBy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orderBy = parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  private isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    return config?.visible ?? true;
  }
}
