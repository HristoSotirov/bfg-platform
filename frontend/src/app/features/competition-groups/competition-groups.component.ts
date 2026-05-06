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
import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { CompetitionGroupDefinitionsService } from '../../core/services/api';
import { CompetitionGroupDefinitionDto } from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { CompetitionGroupsTableComponent } from './components/competition-groups-table/competition-groups-table.component';
import { CompetitionGroupDetailsDialogComponent } from './components/competition-group-details-dialog/competition-group-details-dialog.component';
import { AddCompetitionGroupDialogComponent } from './components/add-competition-group-dialog/add-competition-group-dialog.component';
import { CompetitionGroupsSettingsDialogComponent } from './components/competition-groups-settings-dialog/competition-groups-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CompetitionGroupsFiltersComponent } from './components/competition-groups-filters/competition-groups-filters.component';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface FilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface CompetitionGroupFilters {
  search: string;
  statuses: string[];
}

@Component({
  selector: 'app-competition-groups',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    CompetitionGroupsTableComponent,
    CompetitionGroupDetailsDialogComponent,
    AddCompetitionGroupDialogComponent,
    CompetitionGroupsSettingsDialogComponent,
    ButtonComponent,
    CompetitionGroupsFiltersComponent,
  ],
  templateUrl: './competition-groups.component.html',
  styleUrl: './competition-groups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionGroupsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  groups: CompetitionGroupDefinitionDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;

  filters: CompetitionGroupFilters = {
    search: '',
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;
  groupLookup: Record<string, string> = {};

  columns: ColumnConfig[] = [];

  filterConfigs: FilterConfig[] = [];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  selectedGroup: CompetitionGroupDefinitionDto | null = null;
  private pendingGroupId: string | null = null;

  constructor(
    private authService: AuthService,
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
    this.loadGroupLookup();
    this.initializeUserContext();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['groupId']) {
        this.pendingGroupId = params['groupId'];
        this.openGroupById(this.pendingGroupId!);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdd(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get canEdit(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  private loadGroupLookup(): void {
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
        undefined, undefined, ['name_asc'] as any, top, skip
      ) as any
    ).pipe(takeUntil(this.destroy$)).subscribe((groups: any[]) => {
      const lookup: Record<string, string> = {};
      groups.forEach((g: any) => {
        lookup[g.uuid] = `${g.shortName || g.name} (${g.minAge}-${g.maxAge})`;
      });
      this.groupLookup = lookup;
      this.cdr.markForCheck();
    });
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }
    this.loadGroups();
  }

  loadGroups(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.groups = [];
      this.hasMore = true;
    }

    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

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

    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    this.competitionGroupDefinitionsService
      .getAllCompetitionGroupDefinitions(
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
            this.groups = response.content || [];
          } else {
            this.groups = [...this.groups, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.groups.length < this.totalElements;
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
    this.loadGroups(false);
  }

  onFiltersChange(filters: CompetitionGroupFilters): void {
    this.filters = { ...filters };
    this.saveFilters();
    this.loadGroups();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters();
    this.loadGroups();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters();
    this.loadGroups();
  }

  openDetailsDialog(group: CompetitionGroupDefinitionDto): void {
    this.selectedGroup = group;
    this.isDetailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  private openGroupById(uuid: string): void {
    this.competitionGroupDefinitionsService
      .getCompetitionGroupDefinitionByUuid(uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (group) => {
          this.openDetailsDialog(group);
        },
      });
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedGroup = null;
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
    columns: ColumnConfig[];
    filterConfigs: FilterConfig[];
  }): void {
    this.columns = data.columns;
    this.filterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  onGroupSaved(): void {
    if (this.selectedGroup?.uuid) {
      this.competitionGroupDefinitionsService
        .getCompetitionGroupDefinitionByUuid(this.selectedGroup.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedGroup) => {
            this.selectedGroup = updatedGroup;
            this.cdr.markForCheck();
          },
        });
    }
    this.loadGroups();
  }

  onGroupDeleted(): void {
    this.closeDetailsDialog();
    this.loadGroups();
  }

  onGroupAdded(): void {
    this.loadGroups();
    this.closeAddDialog();
  }

  private initTranslatedLabels(): void {
    this.columns = [
      { id: 'name', label: this.translate.instant('competitionGroups.table.columns.name'), visible: true },
      { id: 'shortName', label: this.translate.instant('competitionGroups.table.columns.shortName'), visible: true },
      { id: 'minAge', label: this.translate.instant('competitionGroups.table.columns.minAge'), visible: true },
      { id: 'maxAge', label: this.translate.instant('competitionGroups.table.columns.maxAge'), visible: true },
      { id: 'coxMinAge', label: this.translate.instant('competitionGroups.table.columns.coxMinAge'), visible: false },
      { id: 'coxMaxAge', label: this.translate.instant('competitionGroups.table.columns.coxMaxAge'), visible: false },
      { id: 'maxDisciplinesPerAthlete', label: this.translate.instant('competitionGroups.table.columns.maxDisciplinesPerAthlete'), visible: true },
      { id: 'transferFromGroupId', label: this.translate.instant('competitionGroups.table.columns.transferFromGroupId'), visible: true },
      { id: 'minCrewForTransfer', label: this.translate.instant('competitionGroups.table.columns.minCrewForTransfer'), visible: true },
      { id: 'transferRatio', label: this.translate.instant('competitionGroups.table.columns.transferRatio'), visible: true },
      { id: 'transferRounding', label: this.translate.instant('competitionGroups.table.columns.transferRounding'), visible: true },
      { id: 'transferredMaxDisciplinesPerAthlete', label: this.translate.instant('competitionGroups.table.columns.transferredMaxDisciplinesPerAthlete'), visible: true },
      { id: 'maleTeamCoxRequiredWeightKg', label: this.translate.instant('competitionGroups.table.columns.maleTeamCoxRequiredWeightKg'), visible: true },
      { id: 'maleTeamCoxMinWeightKg', label: this.translate.instant('competitionGroups.table.columns.maleTeamCoxMinWeightKg'), visible: true },
      { id: 'maleTeamLightMaxWeightKg', label: this.translate.instant('competitionGroups.table.columns.maleTeamLightMaxWeightKg'), visible: true },
      { id: 'femaleTeamCoxRequiredWeightKg', label: this.translate.instant('competitionGroups.table.columns.femaleTeamCoxRequiredWeightKg'), visible: true },
      { id: 'femaleTeamCoxMinWeightKg', label: this.translate.instant('competitionGroups.table.columns.femaleTeamCoxMinWeightKg'), visible: true },
      { id: 'femaleTeamLightMaxWeightKg', label: this.translate.instant('competitionGroups.table.columns.femaleTeamLightMaxWeightKg'), visible: true },
      { id: 'isActive', label: this.translate.instant('competitionGroups.table.columns.isActive'), visible: true },
      { id: 'createdAt', label: this.translate.instant('competitionGroups.table.columns.createdAt'), visible: true },
      { id: 'modifiedAt', label: this.translate.instant('competitionGroups.table.columns.modifiedAt'), visible: true },
    ];
    this.filterConfigs = [
      { id: 'status', label: this.translate.instant('competitionGroups.filterConfigs.status'), visible: true },
    ];
    this.loadSettings();
  }

  private saveSettings(): void {
    localStorage.setItem(
      'competition_groups_columns',
      JSON.stringify(this.columns),
    );
    localStorage.setItem(
      'competition_groups_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem(
      'competition_groups_filterValues',
      JSON.stringify(this.filters),
    );
    localStorage.setItem(
      'competition_groups_orderBy',
      JSON.stringify(this.orderBy),
    );
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('competition_groups_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find((p: ColumnConfig) => p.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem(
      'competition_groups_filterConfigs',
    );
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: FilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter config settings:', e);
      }
    }

    this.loadFilters();
  }

  private loadFilters(): void {
    const savedFilters = localStorage.getItem(
      'competition_groups_filterValues',
    );
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filters = {
          search: parsed.search || '',
          statuses: parsed.statuses || [],
        };
      } catch (e) {
        console.error('Error loading filter values:', e);
      }
    }

    const savedOrderBy = localStorage.getItem('competition_groups_orderBy');
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
