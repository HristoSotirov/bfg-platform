import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { ScopeVisibilityService } from '../../core/services/scope-visibility.service';
import {
  AccreditationsService,
  ClubsService,
  ClubCoachesService,
  ScopeType,
} from '../../core/services/api';
import { calculateRaceGroup } from '../../shared/utils/race-group.util';
import { AccreditationDto, ClubDto } from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { AccreditationsTableComponent } from './components/accreditations-table/accreditations-table.component';
import { AccreditationsFiltersComponent } from './components/accreditations-filters/accreditations-filters.component';
import { AthleteDetailsDialogComponent } from './components/athlete-details-dialog/athlete-details-dialog.component';
import { AddAthleteDialogComponent } from './components/add-athlete-dialog/add-athlete-dialog.component';
import { RenewAccreditationDialogComponent } from './components/renew-accreditation-dialog/renew-accreditation-dialog.component';
import { BatchMedicalDialogComponent } from './components/batch-medical-dialog/batch-medical-dialog.component';
import { AccreditationSettingsDialogComponent } from './components/accreditation-settings-dialog/accreditation-settings-dialog.component';
import { MigrationDialogComponent } from './components/migration-dialog/migration-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import {
  MobileActionMenuComponent,
  MobileActionMenuItem,
} from '../../shared/components/mobile-action-menu/mobile-action-menu.component';

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

export interface AccreditationFilters {
  search: string;
  statuses: string[];
  years: number[];
  clubs: string[]; // Club UUIDs
  raceGroups: string[]; // Race group codes (M12, W12, etc.)
  scopeTypes: string[]; // INTERNAL, EXTERNAL, NATIONAL – from cache only
}

@Component({
  selector: 'app-accreditations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    AccreditationsTableComponent,
    AccreditationsFiltersComponent,
    AthleteDetailsDialogComponent,
    AddAthleteDialogComponent,
    RenewAccreditationDialogComponent,
    BatchMedicalDialogComponent,
    AccreditationSettingsDialogComponent,
    MigrationDialogComponent,
    ButtonComponent,
    MobileActionMenuComponent,
  ],
  templateUrl: './accreditations.component.html',
  styleUrl: './accreditations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  accreditations: AccreditationDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;
  userClub: ClubDto | null = null;
  hasClubAccess = false;

  filters: AccreditationFilters = {
    search: '',
    statuses: [],
    years: [],
    clubs: [],
    raceGroups: [],
    scopeTypes: [],
  };
  orderBy: string[] = ['accreditationNumber_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: ColumnConfig[] = [
    { id: 'firstName', label: 'Име', visible: true },
    { id: 'middleName', label: 'Презиме', visible: true },
    { id: 'lastName', label: 'Фамилия', visible: true },
    { id: 'gender', label: 'Пол', visible: true },
    { id: 'dateOfBirth', label: 'Дата на раждане', visible: true },
    { id: 'raceGroup', label: 'Състез. група', visible: true },
    { id: 'scopeType', label: 'Тип', visible: true },
    { id: 'clubShortName', label: 'Клуб', visible: true },
    { id: 'accreditationNumber', label: 'Номер', visible: true },
    { id: 'year', label: 'Година', visible: true },
    { id: 'status', label: 'Статус', visible: true },
    { id: 'medicalExamDue', label: 'Мед. преглед до', visible: true },
    { id: 'insurance', label: 'Застраховка', visible: true },
    { id: 'createdAt', label: 'Създадена', visible: true },
    { id: 'updatedAt', label: 'Променена', visible: true },
  ];

  filterConfigs: FilterConfig[] = [
    { id: 'status', label: 'Статус', visible: true },
    { id: 'year', label: 'Година', visible: true },
    { id: 'raceGroup', label: 'Състез. група', visible: true },
    // Note: 'club' and 'scopeType' filters are added dynamically based on user permissions
  ];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isRenewDialogOpen = false;
  isSettingsDialogOpen = false;
  isMigrationDialogOpen = false;
  isBatchMedicalDialogOpen = false;

  selectedAccreditation: AccreditationDto | null = null;
  selectedAccreditations = new Set<string>();

  exporting = false;
  mobileMenuOpen = false;

  get mobileMenuItems(): MobileActionMenuItem[] {
    return [
      {
        label: 'Подновяване',
        action: () => this.openRenewDialog(),
        visible: this.canRenewAccreditation,
        disabled: this.selectedAccreditations.size === 0,
      },
      {
        label: 'Добавяне',
        action: () => this.openAddDialog(),
        visible: this.canRenewAccreditation,
      },
      {
        label: 'Мед. данни',
        action: () => this.openBatchMedicalDialog(),
        visible: this.canEdit,
        disabled: this.selectedAccreditations.size === 0,
      },
      {
        label: 'Миграция',
        action: () => this.openMigrationDialog(),
        visible: this.canMigrate,
      },
      {
        label: 'Експорт',
        action: () => this.exportToExcel(),
        disabled: this.exporting || this.totalElements === 0,
      },
    ];
  }

  onMobileMenuToggle(isOpen: boolean): void {
    this.mobileMenuOpen = isOpen;
  }

  selectingAll = false;

  readonly maxSelection = 100;

  selectionMessage: string | null = null;

  selectedAthleteIdsForBatch: string[] | null = null;

  allClubs: ClubDto[] = [];
  availableYears: number[] = [];

  constructor(
    private authService: AuthService,
    private accreditationsService: AccreditationsService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadFilters(); // Load saved filters before initializing
    this.initializeUserContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return (
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  get showScopeFeatures(): boolean {
    return this.scopeVisibility.canViewScopeField();
  }

  get showClubFilter(): boolean {
    return this.scopeVisibility.canViewClubFilter();
  }

  private applyScopeVisibility(): void {
    // Scope field visibility
    if (this.showScopeFeatures) {
      if (!this.filterConfigs.find((f) => f.id === 'scopeType')) {
        this.filterConfigs = [
          ...this.filterConfigs,
          { id: 'scopeType', label: 'Тип', visible: true },
        ];
      }
      const scopeCol = this.columns.find((c) => c.id === 'scopeType');
      if (scopeCol) scopeCol.visible = true;
    } else {
      this.filterConfigs = this.filterConfigs.filter(
        (f) => f.id !== 'scopeType',
      );
      const scopeCol = this.columns.find((c) => c.id === 'scopeType');
      if (scopeCol) scopeCol.visible = false;
      this.filters.scopeTypes = [];
    }

    // Club filter visibility - hide for EXTERNAL/NATIONAL users
    if (this.showClubFilter) {
      // Ensure club filter is in the list if user can see it
      if (!this.filterConfigs.find((f) => f.id === 'club')) {
        // Insert club filter after year filter
        const yearIndex = this.filterConfigs.findIndex((f) => f.id === 'year');
        if (yearIndex >= 0) {
          this.filterConfigs = [
            ...this.filterConfigs.slice(0, yearIndex + 1),
            { id: 'club', label: 'Клуб', visible: true },
            ...this.filterConfigs.slice(yearIndex + 1),
          ];
        } else {
          this.filterConfigs = [
            ...this.filterConfigs,
            { id: 'club', label: 'Клуб', visible: true },
          ];
        }
      }
    } else {
      // Remove club filter from the list
      this.filterConfigs = this.filterConfigs.filter((f) => f.id !== 'club');
      this.filters.clubs = [];
    }
  }

  get canMigrate(): boolean {
    return (
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  get canAddAthlete(): boolean {
    return (
      (this.userRole === 'CLUB_ADMIN' || this.userRole === 'COACH') &&
      this.hasClubAccess
    );
  }

  get canRenewAccreditation(): boolean {
    return (
      (this.userRole === 'CLUB_ADMIN' || this.userRole === 'COACH') &&
      this.hasClubAccess
    );
  }

  get showNoClubMessage(): boolean {
    return (
      (this.userRole === 'CLUB_ADMIN' || this.userRole === 'COACH') &&
      !this.hasClubAccess
    );
  }

  get selectedAccreditationsArray(): AccreditationDto[] {
    return this.accreditations.filter((a) =>
      this.selectedAccreditations.has(a.uuid || ''),
    );
  }

  get uniqueAthleteIdsFromSelection(): string[] {
    const ids = new Set<string>();
    this.selectedAccreditationsArray.forEach((acc) => {
      if (acc.athleteId) ids.add(acc.athleteId);
    });
    return Array.from(ids);
  }

  get athleteIdsForBatchMedical(): string[] {
    return (
      this.selectedAthleteIdsForBatch ?? this.uniqueAthleteIdsFromSelection
    );
  }

  get athleteIdsForRenew(): string[] {
    return (
      this.selectedAthleteIdsForBatch ?? this.uniqueAthleteIdsFromSelection
    );
  }

  get athletesForRenew(): Array<{
    id: string;
    name: string;
    dateOfBirth?: string;
  }> {
    const athleteMap = new Map<
      string,
      { name: string; dateOfBirth?: string }
    >();

    this.selectedAccreditationsArray.forEach((acc) => {
      if (acc.athleteId) {
        const name =
          (acc.athlete
            ? `${acc.athlete.firstName || ''} ${acc.athlete.middleName || ''} ${acc.athlete.lastName || ''}`.trim()
            : '') || acc.athleteId;
        const dateOfBirth = acc.athlete?.dateOfBirth;

        if (!athleteMap.has(acc.athleteId)) {
          athleteMap.set(acc.athleteId, {
            name: name || acc.athleteId,
            dateOfBirth: dateOfBirth,
          });
        }
      }
    });

    return Array.from(athleteMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      dateOfBirth: data.dateOfBirth,
    }));
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (!user || user.roles.length === 0) {
      this.applyScopeVisibility();
      this.loadFilterData();
      this.loadAccreditations();
      return;
    }

    this.userRole = user.roles[0] as SystemRole;
    this.applyRoleBasedColumnVisibility();
    this.applyScopeVisibility();

    if (this.userRole === 'CLUB_ADMIN') {
      this.clubsService
        .getClubByAdminId(user.uuid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (club) => {
            this.userClub = club;
            this.hasClubAccess = !!club;
            this.applyDefaultFiltersIfNeeded();
            this.loadFilterData();
            this.loadAccreditations();
          },
          error: () => {
            this.hasClubAccess = false;
            this.applyDefaultFiltersIfNeeded();
            this.loadFilterData();
            this.loadAccreditations();
          },
        });
    } else if (this.userRole === 'COACH') {
      this.clubCoachesService
        .getClubByCoachId(user.uuid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (club) => {
            this.userClub = club;
            this.hasClubAccess = !!club;
            this.applyDefaultFiltersIfNeeded();
            this.loadFilterData();
            this.loadAccreditations();
          },
          error: () => {
            this.hasClubAccess = false;
            this.applyDefaultFiltersIfNeeded();
            this.loadFilterData();
            this.loadAccreditations();
          },
        });
    } else {
      this.hasClubAccess = true;
      this.applyDefaultFiltersIfNeeded();
      this.loadFilterData();
      this.loadAccreditations();
    }
  }

  private applyRoleBasedColumnVisibility(): void {
    const savedColumns = localStorage.getItem('accreditations_columns');
    const hadSavedSettings = !!savedColumns;

    if (
      (this.userRole === 'CLUB_ADMIN' || this.userRole === 'COACH') &&
      !hadSavedSettings
    ) {
      let modified = false;
      this.columns = this.columns.map((col) => {
        if (col.id === 'createdAt' || col.id === 'updatedAt') {
          if (col.visible) {
            modified = true;
          }
          return { ...col, visible: false };
        }
        return col;
      });

      if (modified) {
        this.saveSettings();
      }
      this.cdr.markForCheck();
    }
  }

  private applyDefaultFiltersIfNeeded(): void {
    // No defaults – only cache restores filter values.
  }

  loadAccreditations(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.accreditations = [];
      this.hasMore = true;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterString = this.buildFilterString();

    this.accreditationsService
      .getAllAccreditations(
        filterString,
        this.filters.search || undefined,
        this.orderBy,
        this.pageSize,
        this.currentSkip,
        ['athlete', 'club'] as Array<'athlete' | 'club'>,
        'body',
        false,
        { transferCache: false },
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
          let accreditations = response.content || [];

          if (
            this.filters.raceGroups.length > 0 &&
            this.isFilterVisible('raceGroup')
          ) {
            accreditations = this.filterByRaceGroup(accreditations);
          }

          if (reset) {
            this.accreditations = accreditations;
          } else {
            this.accreditations = [...this.accreditations, ...accreditations];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.accreditations.length < this.totalElements;
          this.loading = false;
          if (this.selectedAccreditations.size === 0)
            this.selectionMessage = null;
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
    this.loadAccreditations(false);
  }

  private buildFilterString(): string | undefined {
    const filterParts: string[] = [];
    const defaults = this.scopeVisibility.buildDefaultFilter();

    if (this.filters.statuses.length > 0 && this.isFilterVisible('status')) {
      if (this.filters.statuses.length === 1) {
        filterParts.push(`status eq '${this.filters.statuses[0]}'`);
      } else {
        const statusConditions = this.filters.statuses
          .map((s) => `status eq '${s}'`)
          .join(' or ');
        filterParts.push(`(${statusConditions})`);
      }
    }

    if (this.filters.years.length > 0 && this.isFilterVisible('year')) {
      if (this.filters.years.length === 1) {
        filterParts.push(`year eq ${this.filters.years[0]}`);
      } else {
        const yearConditions = this.filters.years
          .map((y) => `year eq ${y}`)
          .join(' or ');
        filterParts.push(`(${yearConditions})`);
      }
    }

    // Club filter - use user's selection if visible, otherwise use default from component's userClub or ScopeVisibilityService
    if (this.showClubFilter) {
      if (this.filters.clubs.length > 0 && this.isFilterVisible('club')) {
        if (this.filters.clubs.length === 1) {
          filterParts.push(`clubId eq '${this.filters.clubs[0]}'`);
        } else {
          const clubConditions = this.filters.clubs
            .map((c) => `clubId eq '${c}'`)
            .join(' or ');
          filterParts.push(`(${clubConditions})`);
        }
      }
    } else {
      // User can't see club filter - always filter by their club
      // Use userClub from component (fetched via getClubByAdminId/getClubByCoachId)
      if (this.userClub?.uuid) {
        filterParts.push(`clubId eq '${this.userClub.uuid}'`);
      }
    }

    // Scope filter - use user's selection if visible, otherwise use default from ScopeVisibilityService
    if (this.showScopeFeatures) {
      if (
        this.filters.scopeTypes?.length > 0 &&
        this.isFilterVisible('scopeType')
      ) {
        if (this.filters.scopeTypes.length === 1) {
          filterParts.push(`scopeType eq '${this.filters.scopeTypes[0]}'`);
        } else {
          const scopeConditions = this.filters.scopeTypes
            .map((s) => `scopeType eq '${s}'`)
            .join(' or ');
          filterParts.push(`(${scopeConditions})`);
        }
      }
    } else if (defaults.scopeType) {
      // User can't see scope filter - always filter by their scope
      filterParts.push(`scopeType eq '${defaults.scopeType}'`);
    }

    return filterParts.length > 0 ? filterParts.join(' and ') : undefined;
  }

  onFiltersChange(filters: AccreditationFilters): void {
    this.filters = { ...filters };
    this.saveFilters(); // Save filters when they change
    this.selectionMessage = null;
    this.selectedAthleteIdsForBatch = null;
    this.loadAccreditations();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters(); // Save filters when search changes
    this.loadAccreditations();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters(); // Save orderBy when it changes
    this.loadAccreditations();
  }

  onSelectionChange(selectedIds: Set<string>): void {
    if (this.loading || this.selectingAll) return;
    this.selectionMessage = null;
    this.selectedAthleteIdsForBatch = null;
    if (selectedIds.size <= this.maxSelection) {
      this.selectedAccreditations = selectedIds;
    } else {
      this.selectedAccreditations = new Set(
        [...selectedIds].slice(0, this.maxSelection),
      );
      this.selectionMessage = `Само първите ${this.maxSelection} акредитации са избрани.`;
    }
    this.cdr.markForCheck();
  }

  onSelectAllRequested(): void {
    this.selectAllMatchingFilter();
  }

  deselectAll(): void {
    this.selectedAccreditations = new Set();
    this.selectionMessage = null;
    this.selectedAthleteIdsForBatch = null;
    this.cdr.markForCheck();
  }

  private selectAllMatchingFilter(): void {
    this.selectingAll = true;
    this.error = null;
    this.selectionMessage = null;
    this.selectedAthleteIdsForBatch = null;
    this.cdr.markForCheck();
    const collected = new Set<string>();
    const collectedAthleteIds = new Set<string>();
    const filterString = this.buildFilterString();

    const fetchPage = (skip: number): void => {
      this.accreditationsService
        .getAllAccreditations(
          filterString,
          this.filters.search || undefined,
          this.orderBy,
          this.pageSize,
          skip,
          ['athlete', 'club'] as Array<'athlete' | 'club'>,
          'body',
          false,
          { transferCache: false },
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            let list = response?.content || [];
            if (
              this.filters.raceGroups.length > 0 &&
              this.isFilterVisible('raceGroup')
            ) {
              list = this.filterByRaceGroup(list);
            }
            for (const acc of list) {
              if (acc.uuid) {
                collected.add(acc.uuid);
                if (acc.athleteId) collectedAthleteIds.add(acc.athleteId);
              }
              if (collected.size >= this.maxSelection) break;
            }
            const total = response?.totalElements ?? 0;
            const reachedLimit = collected.size >= this.maxSelection;
            const noMorePages =
              list.length < this.pageSize || skip + list.length >= total;
            if (noMorePages || reachedLimit) {
              this.selectedAccreditations = new Set(
                [...collected].slice(0, this.maxSelection),
              );
              this.selectedAthleteIdsForBatch = Array.from(collectedAthleteIds);
              if (
                reachedLimit &&
                (total > this.maxSelection || list.length === this.pageSize)
              ) {
                this.selectionMessage = `Само първите ${this.maxSelection} акредитации са избрани.`;
              }
              this.selectingAll = false;
              this.cdr.markForCheck();
            } else {
              fetchPage(skip + this.pageSize);
            }
          },
          error: (err) => {
            this.selectingAll = false;
            this.error = err?.error?.message || 'Грешка при избиране на всички';
            this.cdr.markForCheck();
          },
        });
    };
    fetchPage(0);
  }

  openDetailsDialog(accreditation: AccreditationDto): void {
    this.selectedAccreditation = accreditation;
    this.isDetailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedAccreditation = null;
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

  onAthleteCreated(): void {
    this.loadAccreditations();
    this.closeAddDialog();
  }

  openRenewDialog(): void {
    this.isRenewDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeRenewDialog(): void {
    this.isRenewDialogOpen = false;
    this.cdr.markForCheck();
  }

  openBatchMedicalDialog(): void {
    this.isBatchMedicalDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeBatchMedicalDialog(clearSelection: boolean = false): void {
    this.isBatchMedicalDialogOpen = false;
    if (clearSelection) {
      this.selectedAccreditations = new Set();
      this.selectionMessage = null;
      this.selectedAthleteIdsForBatch = null;
    }
    this.cdr.markForCheck();
  }

  onBatchMedicalComplete(): void {
    this.loadAccreditations();
    this.closeBatchMedicalDialog(true); // Clear selection only after successful save
  }

  openSettingsDialog(): void {
    this.isSettingsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeSettingsDialog(): void {
    this.isSettingsDialogOpen = false;
    this.cdr.markForCheck();
  }

  openMigrationDialog(): void {
    this.isMigrationDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeMigrationDialog(): void {
    this.isMigrationDialogOpen = false;
    this.cdr.markForCheck();
  }

  onAthleteUpdated(): void {
    this.loadAccreditations();
    this.closeDetailsDialog();
  }

  onRenewalComplete(): void {
    this.loadAccreditations();
    this.selectedAccreditations = new Set();
    this.selectionMessage = null;
    this.selectedAthleteIdsForBatch = null;
    this.closeRenewDialog();
  }

  onMigrationComplete(): void {
    this.loadAccreditations();
    this.closeMigrationDialog();
  }

  onSettingsChange(settings: {
    columns: ColumnConfig[];
    filterConfigs: FilterConfig[];
  }): void {
    const oldFilterConfigs = this.filterConfigs;
    const newFilterConfigs = settings.filterConfigs;

    newFilterConfigs.forEach((newFilter) => {
      const oldFilter = oldFilterConfigs.find((f) => f.id === newFilter.id);
      if (oldFilter && oldFilter.visible && !newFilter.visible) {
        if (newFilter.id === 'status') this.filters.statuses = [];
        if (newFilter.id === 'year') this.filters.years = [];
        if (newFilter.id === 'club') this.filters.clubs = [];
        if (newFilter.id === 'raceGroup') this.filters.raceGroups = [];
        if (newFilter.id === 'scopeType') this.filters.scopeTypes = [];
      } else if (
        (oldFilter && !oldFilter.visible && newFilter.visible) ||
        (!oldFilter && newFilter.visible)
      ) {
        if (newFilter.id === 'status') this.filters.statuses = [];
        if (newFilter.id === 'scopeType') this.filters.scopeTypes = [];
        if (newFilter.id === 'year') this.filters.years = [];
        if (newFilter.id === 'club') this.filters.clubs = [];
        if (newFilter.id === 'raceGroup') this.filters.raceGroups = [];
      }
    });

    this.columns = settings.columns;
    this.filterConfigs = settings.filterConfigs;
    this.saveSettings(); // Save column and filter config settings
    this.saveFilters(); // Also save current filter values
    this.loadAccreditations();
    this.cdr.markForCheck();
  }

  private saveSettings(): void {
    localStorage.setItem(
      'accreditations_columns',
      JSON.stringify(this.columns),
    );
    localStorage.setItem(
      'accreditations_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem(
      'accreditations_filters',
      JSON.stringify(this.filters),
    );
    localStorage.setItem(
      'accreditations_orderBy',
      JSON.stringify(this.orderBy),
    );
  }

  private loadFilters(): void {
    const savedFilters = localStorage.getItem('accreditations_filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filters = {
          search: parsed.search || '',
          statuses: parsed.statuses || [],
          years: parsed.years ?? [],
          clubs: parsed.clubs ?? [],
          raceGroups: parsed.raceGroups ?? [],
          scopeTypes: parsed.scopeTypes ?? [],
        };
      } catch (e) {
        console.error('Error loading filter settings:', e);
      }
    }

    const savedOrderBy = localStorage.getItem('accreditations_orderBy');
    if (savedOrderBy) {
      try {
        this.orderBy = JSON.parse(savedOrderBy);
      } catch (e) {
        console.error('Error loading orderBy settings:', e);
      }
    }
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('accreditations_columns');
    const hasSavedSettings = !!savedColumns;

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

    (this as any)._hadSavedColumnSettings = hasSavedSettings;

    const savedFilterConfigs = localStorage.getItem(
      'accreditations_filterConfigs',
    );
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        // Only restore visibility for filters that exist in current config
        // Don't add filters from saved settings that aren't in current config
        // (e.g., club filter for EXTERNAL/NATIONAL users)
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: FilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter settings:', e);
      }
    }
  }

  private formatDateForExcel(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      let dateOnly: string;
      if (dateStr.includes('T')) {
        dateOnly = dateStr.split('T')[0];
      } else if (dateStr.includes(' ')) {
        dateOnly = dateStr.split(' ')[0];
      } else {
        dateOnly = dateStr;
      }

      const parts = dateOnly.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (
          year >= 1900 &&
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31
        ) {
          return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
        }
      }

      const date = new Date(dateOnly + 'T00:00:00Z');
      if (!isNaN(date.getTime())) {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}.${month}.${year}`;
      }

      return dateStr;
    } catch {
      return dateStr;
    }
  }

  exportToExcel(): void {
    if (this.exporting) return;

    this.exporting = true;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

    if (this.filters.statuses.length > 0) {
      if (this.filters.statuses.length === 1) {
        filterParts.push(`status eq '${this.filters.statuses[0]}'`);
      } else {
        const statusConditions = this.filters.statuses
          .map((s) => `status eq '${s}'`)
          .join(' or ');
        filterParts.push(`(${statusConditions})`);
      }
    }

    if (this.filters.years.length > 0) {
      if (this.filters.years.length === 1) {
        filterParts.push(`year eq ${this.filters.years[0]}`);
      } else {
        const yearConditions = this.filters.years
          .map((y) => `year eq ${y}`)
          .join(' or ');
        filterParts.push(`(${yearConditions})`);
      }
    }

    if (this.userRole === 'CLUB_ADMIN' && this.userClub?.uuid) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    } else if (
      this.userRole === 'COACH' &&
      this.hasClubAccess &&
      this.userClub?.uuid
    ) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    }

    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    fetchAllPages((skip, top) =>
      this.accreditationsService.getAllAccreditations(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        top,
        skip,
        ['athlete', 'club'] as Array<'athlete' | 'club'>,
      ) as any
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (allItems: any[]) => {
          let allAccreditations = allItems;

          if (
            this.filters.raceGroups.length > 0 &&
            this.isFilterVisible('raceGroup')
          ) {
            allAccreditations = this.filterByRaceGroup(allAccreditations);
          }

          if (allAccreditations.length === 0) {
            this.error = 'Няма данни за експорт';
            this.exporting = false;
            this.cdr.markForCheck();
            return;
          }

          try {
            const XLSX = await import('xlsx');

            const visibleColumns = this.columns.filter((col) => col.visible);

            const data = allAccreditations.map((acc) => {
              const row: any = {};

              visibleColumns.forEach((col) => {
                switch (col.id) {
                  case 'firstName':
                    row[col.label] = acc.athlete?.firstName || '';
                    break;
                  case 'middleName':
                    row[col.label] = acc.athlete?.middleName || '';
                    break;
                  case 'lastName':
                    row[col.label] = acc.athlete?.lastName || '';
                    break;
                  case 'gender':
                    row[col.label] =
                      acc.athlete?.gender === 'MALE'
                        ? 'Мъж'
                        : acc.athlete?.gender === 'FEMALE'
                          ? 'Жена'
                          : '';
                    break;
                  case 'dateOfBirth':
                    row[col.label] = this.formatDateForExcel(
                      acc.athlete?.dateOfBirth,
                    );
                    break;
                  case 'raceGroup':
                    const raceGroup = calculateRaceGroup(
                      acc.athlete?.dateOfBirth,
                      acc.athlete?.gender,
                    );
                    row[col.label] = raceGroup.label || '';
                    break;
                  case 'clubShortName':
                    row[col.label] = acc.club?.shortName || '';
                    break;
                  case 'scopeType':
                    row[col.label] = acc.scopeType
                      ? ({
                          INTERNAL: 'Вътрешен',
                          EXTERNAL: 'Външен',
                          NATIONAL: 'Национален',
                        } as Record<string, string>)[acc.scopeType] ?? acc.scopeType
                      : '';
                    break;
                  case 'accreditationNumber':
                    row[col.label] = acc.accreditationNumber || '';
                    break;
                  case 'year':
                    row[col.label] = acc.year || '';
                    break;
                  case 'status':
                    row[col.label] = this.getStatusLabel(acc.status);
                    break;
                  case 'medicalExamDue':
                    row[col.label] = this.formatDateForExcel(
                      acc.athlete?.medicalExaminationDue,
                    );
                    break;
                  case 'insurance':
                    row['Застраховка от'] = this.formatDateForExcel(
                      acc.athlete?.insuranceFrom,
                    );
                    row['Застраховка до'] = this.formatDateForExcel(
                      acc.athlete?.insuranceTo,
                    );
                    break;
                  case 'createdAt':
                    row[col.label] = this.formatDateForExcel(acc.createdAt);
                    break;
                  case 'updatedAt':
                    row[col.label] = this.formatDateForExcel(acc.updatedAt);
                    break;
                }
              });

              return row;
            });

            const ws = XLSX.utils.json_to_sheet(data);

            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            const datePattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;
            const dateColumns: Set<number> = new Set();

            for (let row = range.s.r + 1; row <= range.e.r; row++) {
              for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = ws[cellAddress];
                if (cell && cell.v && typeof cell.v === 'string') {
                  const match = cell.v.match(datePattern);
                  if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10);
                    const year = parseInt(match[3], 10);

                    if (
                      day >= 1 &&
                      day <= 31 &&
                      month >= 1 &&
                      month <= 12 &&
                      year >= 1900
                    ) {
                      const excelDate = new Date(
                        Date.UTC(year, month - 1, day, 0, 0, 0, 0),
                      );
                      if (!isNaN(excelDate.getTime())) {
                        const excelEpoch = new Date(
                          Date.UTC(1899, 11, 30, 0, 0, 0, 0),
                        );
                        const excelSerial =
                          (excelDate.getTime() - excelEpoch.getTime()) /
                          (24 * 60 * 60 * 1000);
                        cell.v = excelSerial;
                        cell.z = 'dd.mm.yyyy'; // Excel date format (date only, no time)
                        cell.t = 'n'; // Number type
                        dateColumns.add(col); // Track date columns for width setting
                      }
                    }
                  }
                }
              }
            }

            if (!ws['!cols']) ws['!cols'] = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
              if (dateColumns.has(col)) {
                ws['!cols'][col] = { wch: 12 }; // Set width for date columns
              } else if (!ws['!cols'][col]) {
                ws['!cols'][col] = { wch: 15 }; // Default width for other columns
              }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Картотеки');
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            XLSX.writeFile(wb, `accreditations_${dateStr}.xlsx`);

            this.exporting = false;
            this.cdr.markForCheck();
          } catch (error) {
            console.error('Export error:', error);
            this.error = 'Грешка при експорт на данните';
            this.exporting = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.exporting = false;
          this.cdr.markForCheck();
        },
      });
  }

  private getStatusLabel(status: string | undefined): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Активна',
      PENDING_VALIDATION: 'Заявена',
      PENDING_PHOTO_VALIDATION: 'Чакаща снимка',
      NEW_PHOTO_REQUIRED: 'Нова снимка',
      EXPIRED: 'Изтекла',
      SUSPENDED: 'Спряна',
    };
    return statusMap[status || ''] || status || '';
  }

  private isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    return config?.visible ?? true;
  }

  private loadFilterData(): void {
    this.loadClubs();
    this.loadYears();
  }

  private loadClubs(): void {
    // If user can't see the club filter, they don't need the club list
    if (!this.showClubFilter) {
      this.allClubs = [];
      return;
    }

    // Build filter based on user's allowed scopes
    const allowedScopes = this.scopeVisibility.getAllowedScopes();
    let filter: string | undefined;

    if (allowedScopes.length > 0 && !this.scopeVisibility.canViewScopeField()) {
      // Non-admin users should only see clubs in their scope
      if (allowedScopes.length === 1) {
        filter = `scopeType eq '${allowedScopes[0]}'`;
      } else {
        const scopeConditions = allowedScopes
          .map((s) => `scopeType eq '${s}'`)
          .join(' or ');
        filter = `(${scopeConditions})`;
      }
    }

    fetchAllPages((skip, top) =>
      this.clubsService.getAllClubs(
        filter, // filter by scope if needed
        undefined, // search
        ['cardPrefix_asc'], // orderBy
        top, // top
        skip, // skip
        ['clubAdminUser'] as Array<'clubAdminUser'>, // expand
        'body',
        false,
        { transferCache: false },
      ) as any
    ).pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (clubs: any[]) => {
          this.allClubs = clubs;
          this.cdr.markForCheck();
        },
      });
  }

  private loadYears(): void {
    // Build minimal filter to satisfy scope/club restrictions
    const defaults = this.scopeVisibility.buildDefaultFilter();
    const filterParts: string[] = [];

    if (defaults.scopeType) {
      filterParts.push(`scopeType eq '${defaults.scopeType}'`);
    }
    // Use userClub from component (fetched via getClubByAdminId/getClubByCoachId)
    if (!this.showClubFilter && this.userClub?.uuid) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    }

    const filter =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    this.accreditationsService
      .getAllAccreditations(
        filter,
        undefined, // search
        ['year_asc'], // orderBy - oldest first
        1, // top - just need one
        0, // skip
        undefined, // expand
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 })),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          const oldestYear =
            response.content &&
            response.content.length > 0 &&
            response.content[0].year
              ? response.content[0].year
              : new Date().getFullYear();
          const currentYear = new Date().getFullYear();

          this.availableYears = [];
          if (oldestYear && typeof oldestYear === 'number') {
            for (let y = currentYear; y >= oldestYear; y--) {
              this.availableYears.push(y);
            }
          } else {
            this.availableYears.push(currentYear);
          }

          this.cdr.markForCheck();
        },
      });
  }

  private filterByRaceGroup(
    accreditations: AccreditationDto[],
  ): AccreditationDto[] {
    if (this.filters.raceGroups.length === 0) {
      return accreditations;
    }

    return accreditations.filter((acc) => {
      const raceGroup = calculateRaceGroup(
        acc.athlete?.dateOfBirth,
        acc.athlete?.gender,
      );
      return this.filters.raceGroups.includes(raceGroup.code);
    });
  }
}
