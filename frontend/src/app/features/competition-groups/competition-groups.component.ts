import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
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
  genders: string[];
  statuses: string[];
}

@Component({
  selector: 'app-competition-groups',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
    genders: [],
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;
  groupLookup: Record<string, string> = {};

  columns: ColumnConfig[] = [
    { id: 'name', label: 'Име', visible: true },
    { id: 'shortName', label: 'Кратко име', visible: true },
    { id: 'gender', label: 'Пол', visible: true },
    { id: 'minAge', label: 'Мин. възраст', visible: true },
    { id: 'maxAge', label: 'Макс. възраст', visible: true },
    { id: 'transferFromGroupId', label: 'Трансфер от група', visible: true },
    { id: 'minCrewForTransfer', label: 'Мин. екипаж', visible: true },
    { id: 'transferRatio', label: 'Съотношение', visible: true },
    { id: 'transferRounding', label: 'Закръгляне', visible: true },
    { id: 'coxRequiredWeightKg', label: 'Тегло кокс (изисквано)', visible: true },
    { id: 'coxMinWeightKg', label: 'Тегло кокс (мин.)', visible: true },
    { id: 'lightMaxWeightKg', label: 'Тегло лековес (макс.)', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  filterConfigs: FilterConfig[] = [
    { id: 'gender', label: 'Пол', visible: true },
    { id: 'status', label: 'Статус', visible: true },
  ];

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
  ) {}

  ngOnInit(): void {
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
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  get canEdit(): boolean {
    return (
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  private loadGroupLookup(): void {
    this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
      undefined, undefined, ['name_asc'] as any, 1000, 0
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const lookup: Record<string, string> = {};
        (response.content || []).forEach((g: any) => {
          lookup[g.uuid] = `${g.name} (${g.minAge}-${g.maxAge})`;
        });
        this.groupLookup = lookup;
        this.cdr.markForCheck();
      }
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

    if (this.filters.genders.length > 0 && this.isFilterVisible('gender')) {
      if (this.filters.genders.length === 1) {
        filterParts.push(`gender eq '${this.filters.genders[0]}'`);
      } else {
        const genderConditions = this.filters.genders
          .map((g) => `gender eq '${g}'`)
          .join(' or ');
        filterParts.push(`(${genderConditions})`);
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
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
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
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
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
          genders: parsed.genders || [],
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
