import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { ScopeVisibilityService } from '../../core/services/scope-visibility.service';
import {
  AccreditationsService,
  AthletesService,
  ClubsService,
  ClubCoachesService,
  Gender,
  AccreditationStatus,
} from '../../core/services/api';
import { AccreditationDto, AthleteDto, ClubDto, ScopeType } from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { AccreditationsTableComponent } from './components/accreditations-table/accreditations-table.component';
import { AthletesTableComponent } from './components/athletes-table/athletes-table.component';
import { AthletesFiltersComponent } from './components/athletes-filters/athletes-filters.component';
import { AccreditationsFiltersComponent } from './components/accreditations-filters/accreditations-filters.component';
import { AddAthleteDialogComponent } from './components/add-athlete-dialog/add-athlete-dialog.component';
import { RenewAccreditationDialogComponent } from './components/renew-accreditation-dialog/renew-accreditation-dialog.component';
import { BatchMedicalDialogComponent } from './components/batch-medical-dialog/batch-medical-dialog.component';
import { AccreditationSettingsDialogComponent } from './components/accreditation-settings-dialog/accreditation-settings-dialog.component';
import { AthletesSettingsDialogComponent } from './components/athletes-settings-dialog/athletes-settings-dialog.component';
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

export interface AthleteFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface AthleteFilters {
  search: string;
  genders: string[];
  birthYears: number[];
}

export interface AccreditationFilters {
  search: string;
  statuses: string[];
  genders: string[];
  birthYears: number[]; // Athlete birth years
  clubs: string[]; // Club UUIDs
  years: number[];
}

@Component({
  selector: 'app-accreditations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    AccreditationsTableComponent,
    AthletesTableComponent,
    AthletesFiltersComponent,
    AccreditationsFiltersComponent,
    AddAthleteDialogComponent,
    RenewAccreditationDialogComponent,
    BatchMedicalDialogComponent,
    AccreditationSettingsDialogComponent,
    AthletesSettingsDialogComponent,
    MigrationDialogComponent,
    ButtonComponent,
    MobileActionMenuComponent,
    TranslateModule,
  ],
  templateUrl: './accreditations.component.html',
  styleUrl: './accreditations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: 'accreditations' | 'athletes' = 'accreditations';

  accreditations: AccreditationDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  // Athletes tab
  athletes: AthleteDto[] = [];
  athletesTotalElements = 0;
  athletesLoading = false;
  athletesSkip = 0;
  athletesHasMore = false;
  private athletesLoaded = false;

  athleteFilters: AthleteFilters = {
    search: '',
    genders: [],
    birthYears: [],
  };
  athleteFilterConfigs: AthleteFilterConfig[] = [
    { id: 'gender', label: this.translateService.instant('accreditations.columns.gender'), visible: true },
    { id: 'birthYear', label: this.translateService.instant('accreditations.filters.birthYearFull'), visible: true },
  ];
  availableBirthYears: number[] = [];
  athleteOrderBy: string[] = ['lastName_asc'];

  athleteColumns: ColumnConfig[] = [
    { id: 'lastName', label: this.translateService.instant('accreditations.columns.lastName'), visible: true },
    { id: 'firstName', label: this.translateService.instant('accreditations.columns.firstName'), visible: true },
    { id: 'middleName', label: this.translateService.instant('accreditations.columns.middleName'), visible: true },
    { id: 'dateOfBirth', label: this.translateService.instant('accreditations.columns.dateOfBirth'), visible: true },
    { id: 'gender', label: this.translateService.instant('accreditations.columns.gender'), visible: true },
    { id: 'medicalExaminationDue', label: this.translateService.instant('accreditations.columns.medicalExamDue'), visible: false },
    { id: 'insurance', label: this.translateService.instant('accreditations.columns.insurance'), visible: false },
    { id: 'registeredOn', label: this.translateService.instant('accreditations.columns.registeredAt'), visible: false },
    { id: 'modifiedAt', label: this.translateService.instant('accreditations.columns.modifiedOn'), visible: false },
  ];

  isAthletesSettingsDialogOpen = false;

  userRole: SystemRole | null = null;
  userClub: ClubDto | null = null;
  hasClubAccess = false;

  filters: AccreditationFilters = {
    search: '',
    statuses: [],
    genders: [],
    birthYears: [],
    clubs: [],
    years: [],
  };
  orderBy: string[] = ['accreditationNumber_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: ColumnConfig[] = [
    { id: 'firstName', label: this.translateService.instant('accreditations.columns.firstName'), visible: true },
    { id: 'middleName', label: this.translateService.instant('accreditations.columns.middleName'), visible: true },
    { id: 'lastName', label: this.translateService.instant('accreditations.columns.lastName'), visible: true },
    { id: 'gender', label: this.translateService.instant('accreditations.columns.gender'), visible: true },
    { id: 'dateOfBirth', label: this.translateService.instant('accreditations.columns.dateOfBirth'), visible: true },
    { id: 'clubShortName', label: this.translateService.instant('accreditations.columns.club'), visible: true },
    { id: 'accreditationNumber', label: this.translateService.instant('accreditations.columns.number'), visible: true },
    { id: 'year', label: this.translateService.instant('accreditations.columns.year'), visible: true },
    { id: 'status', label: this.translateService.instant('accreditations.columns.status'), visible: true },
    { id: 'medicalExamDue', label: this.translateService.instant('accreditations.columns.medicalExamDue'), visible: true },
    { id: 'insurance', label: this.translateService.instant('accreditations.columns.insurance'), visible: true },
    { id: 'createdAt', label: this.translateService.instant('accreditations.columns.createdAt'), visible: true },
    { id: 'updatedAt', label: this.translateService.instant('accreditations.columns.modifiedAt'), visible: true },
  ];

  filterConfigs: FilterConfig[] = [
    { id: 'gender', label: this.translateService.instant('accreditations.columns.gender'), visible: true },
    { id: 'birthYear', label: this.translateService.instant('accreditations.filters.birthYearFull'), visible: true },
    { id: 'year', label: this.translateService.instant('accreditations.columns.year'), visible: true },
    { id: 'status', label: this.translateService.instant('accreditations.columns.status'), visible: true },
    // Note: 'club' filter is added dynamically based on user permissions
  ];

  isAddDialogOpen = false;
  isRenewDialogOpen = false;
  isSettingsDialogOpen = false;
  isMigrationDialogOpen = false;
  isBatchMedicalDialogOpen = false;
  selectedAccreditations = new Set<string>();

  exporting = false;
  mobileMenuOpen = false;

  get mobileMenuItems(): MobileActionMenuItem[] {
    return [
      {
        label: this.translateService.instant('accreditations.page.mobileMenu.renew'),
        action: () => this.openRenewDialog(),
        visible: this.canRenewAccreditation,
        disabled: this.selectedAccreditations.size === 0,
      },
      {
        label: this.translateService.instant('accreditations.page.mobileMenu.add'),
        action: () => this.openAddDialog(),
        visible: this.canRenewAccreditation,
      },
      {
        label: this.translateService.instant('accreditations.page.mobileMenu.medicalData'),
        action: () => this.openBatchMedicalDialog(),
        visible: this.canEdit,
        disabled: this.selectedAccreditations.size === 0,
      },
      {
        label: this.translateService.instant('accreditations.page.mobileMenu.migration'),
        action: () => this.openMigrationDialog(),
        visible: this.canMigrate,
      },
      {
        label: this.translateService.instant('accreditations.page.mobileMenu.export'),
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
  availableAccreditationBirthYears: number[] = [];

  constructor(
    private authService: AuthService,
    private accreditationsService: AccreditationsService,
    private athletesService: AthletesService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private scopeVisibility: ScopeVisibilityService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadFilters();
    this.initializeUserContext();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'athletes') {
        this.activeTab = 'athletes';
        if (!this.athletesLoaded) {
          this.loadBirthYearRange();
          this.loadAthletes();
        }
      } else {
        this.activeTab = 'accreditations';
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get showScopeFeatures(): boolean {
    return this.scopeVisibility.canViewTypeField();
  }

  get showClubFilter(): boolean {
    return this.scopeVisibility.isAdmin() || this.userClub?.type === ScopeType.Internal;
  }

  private applyScopeVisibility(): void {
    // Club filter visibility - hide for non-admin users
    if (this.showClubFilter) {
      // Ensure club filter is in the list if user can see it
      if (!this.filterConfigs.find((f) => f.id === 'club')) {
        // Insert club filter after birthYear filter
        const yearIndex = this.filterConfigs.findIndex((f) => f.id === 'birthYear');
        if (yearIndex >= 0) {
          this.filterConfigs = [
            ...this.filterConfigs.slice(0, yearIndex + 1),
            { id: 'club', label: this.translateService.instant('accreditations.filters.club'), visible: true },
            ...this.filterConfigs.slice(yearIndex + 1),
          ];
        } else {
          this.filterConfigs = [
            ...this.filterConfigs,
            { id: 'club', label: this.translateService.instant('accreditations.filters.club'), visible: true },
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
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get canAddAthlete(): boolean {
    return (
      (this.userRole === SystemRole.ClubAdmin || this.userRole === SystemRole.Coach) &&
      this.hasClubAccess
    );
  }

  get canRenewAccreditation(): boolean {
    return (
      (this.userRole === SystemRole.ClubAdmin || this.userRole === SystemRole.Coach) &&
      this.hasClubAccess
    );
  }

  get showNoClubMessage(): boolean {
    return (
      (this.userRole === SystemRole.ClubAdmin || this.userRole === SystemRole.Coach) &&
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

    if (this.userRole === SystemRole.ClubAdmin) {
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
            this.applyScopeVisibility();
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
    } else if (this.userRole === SystemRole.Coach) {
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
            this.applyScopeVisibility();
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
      (this.userRole === SystemRole.ClubAdmin || this.userRole === SystemRole.Coach) &&
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
          this.error = err?.error?.message || this.translateService.instant('accreditations.page.loadError');
          this.loading = false;
          return of({ content: [], totalElements: 0 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          const accreditations = response.content || [];

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
          this.error = err?.error?.message || this.translateService.instant('accreditations.page.loadError');
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

    if (this.filters.genders.length > 0 && this.isFilterVisible('gender')) {
      if (this.filters.genders.length === 1) {
        filterParts.push(`athlete.gender eq '${this.filters.genders[0]}'`);
      } else {
        const genderConditions = this.filters.genders
          .map((g) => `athlete.gender eq '${g}'`)
          .join(' or ');
        filterParts.push(`(${genderConditions})`);
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

    if (this.filters.birthYears.length > 0 && this.isFilterVisible('birthYear')) {
      const birthYearConditions = this.filters.birthYears.map((y) => {
        const start = `${y}-01-01`;
        const end = `${y}-12-31`;
        return `(athlete.dateOfBirth ge '${start}' and athlete.dateOfBirth le '${end}')`;
      });
      filterParts.push(birthYearConditions.length === 1 ? birthYearConditions[0] : `(${birthYearConditions.join(' or ')})`);
    }

    // Club filter - use user's selection if visible, otherwise use userClub
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
      // INTERNAL users see all internal accreditations — no club restriction
      // EXTERNAL/NATIONAL users are restricted to their own club
      if (this.userClub?.uuid && this.userClub.type !== ScopeType.Internal) {
        filterParts.push(`clubId eq '${this.userClub.uuid}'`);
      }
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
      this.selectionMessage = this.translateService.instant('accreditations.page.selection.maxSelectionMessage', { max: this.maxSelection });
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
                this.selectionMessage = this.translateService.instant('accreditations.page.selection.maxSelectionMessage', { max: this.maxSelection });
              }
              this.selectingAll = false;
              this.cdr.markForCheck();
            } else {
              fetchPage(skip + this.pageSize);
            }
          },
          error: (err) => {
            this.selectingAll = false;
            this.error = err?.error?.message || this.translateService.instant('accreditations.page.selectAllError');
            this.cdr.markForCheck();
          },
        });
    };
    fetchPage(0);
  }

  openDetailsDialog(accreditation: AccreditationDto): void {
    this.router.navigate(['/athletes', accreditation.athleteId]);
  }

  onAthleteRowClick(athlete: AthleteDto): void {
    this.router.navigate(['/athletes', athlete.uuid]);
  }

  setTab(tab: 'accreditations' | 'athletes'): void {
    this.router.navigate([], { queryParams: { tab: tab === 'accreditations' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  loadAthletes(reset = true): void {
    if (reset) {
      this.athletesSkip = 0;
      this.athletes = [];
      this.athletesHasMore = false;
    }
    if (this.athletesLoading) return;
    this.athletesLoading = true;
    this.athletesLoaded = true;
    this.cdr.markForCheck();

    const filter = this.buildAthleteFilterString();

    this.athletesService
      .getAllAthletes(filter, this.athleteFilters.search || undefined, this.athleteOrderBy as any, 50, this.athletesSkip)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 })),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          const items: AthleteDto[] = response.content || [];
          this.athletes = reset ? items : [...this.athletes, ...items];
          this.athletesTotalElements = response.totalElements || 0;
          this.athletesHasMore = this.athletes.length < this.athletesTotalElements;
          this.athletesLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadBirthYearRange(): void {
    this.athletesService
      .getAllAthletes(undefined, undefined, ['dateOfBirth_asc'] as any, 1, 0)
      .pipe(catchError(() => of({ content: [] })), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const oldest = res.content?.[0]?.dateOfBirth;
        this.athletesService
          .getAllAthletes(undefined, undefined, ['dateOfBirth_desc'] as any, 1, 0)
          .pipe(catchError(() => of({ content: [] })), takeUntil(this.destroy$))
          .subscribe((res2: any) => {
            const youngest = res2.content?.[0]?.dateOfBirth;
            if (oldest && youngest) {
              const oldestYear = new Date(oldest).getFullYear();
              const youngestYear = new Date(youngest).getFullYear();
              this.availableBirthYears = [];
              for (let y = youngestYear; y >= oldestYear; y--) {
                this.availableBirthYears.push(y);
              }
            }
            this.cdr.markForCheck();
          });
      });
  }

  private buildAthleteFilterString(): string | undefined {
    const parts: string[] = [];
    if (this.athleteFilters.genders.length > 0) {
      if (this.athleteFilters.genders.length === 1) {
        parts.push(`gender eq '${this.athleteFilters.genders[0]}'`);
      } else {
        parts.push(`(${this.athleteFilters.genders.map((g) => `gender eq '${g}'`).join(' or ')})`);
      }
    }
    if (this.athleteFilters.birthYears.length > 0) {
      const yearConditions = this.athleteFilters.birthYears.map((y) => {
        const start = `${y}-01-01`;
        const end = `${y}-12-31`;
        return `(dateOfBirth ge '${start}' and dateOfBirth le '${end}')`;
      });
      parts.push(yearConditions.length === 1 ? yearConditions[0] : `(${yearConditions.join(' or ')})`);
    }
    return parts.length > 0 ? parts.join(' and ') : undefined;
  }

  onAthleteFiltersChange(filters: AthleteFilters): void {
    this.athleteFilters = { ...filters };
    this.saveAthleteSettings();
    this.loadAthletes();
  }

  onAthleteSearchChange(search: string): void {
    this.athleteFilters.search = search;
    this.saveAthleteSettings();
    this.loadAthletes();
  }

  onAthleteSortChange(orderBy: string[]): void {
    this.athleteOrderBy = orderBy;
    this.saveAthleteSettings();
    this.loadAthletes();
  }

  loadMoreAthletes(): void {
    if (this.athletesLoading || !this.athletesHasMore) return;
    this.athletesSkip += 50;
    this.loadAthletes(false);
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
        if (newFilter.id === 'gender') this.filters.genders = [];
        if (newFilter.id === 'year') this.filters.years = [];
        if (newFilter.id === 'club') this.filters.clubs = [];
        if (newFilter.id === 'birthYear') this.filters.birthYears = [];
      } else if (
        (oldFilter && !oldFilter.visible && newFilter.visible) ||
        (!oldFilter && newFilter.visible)
      ) {
        if (newFilter.id === 'status') this.filters.statuses = [];
        if (newFilter.id === 'gender') this.filters.genders = [];
        if (newFilter.id === 'year') this.filters.years = [];
        if (newFilter.id === 'club') this.filters.clubs = [];
        if (newFilter.id === 'birthYear') this.filters.birthYears = [];
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

  private saveAthleteSettings(): void {
    localStorage.setItem('athletes_columns', JSON.stringify(this.athleteColumns));
    localStorage.setItem('athletes_filterConfigs', JSON.stringify(this.athleteFilterConfigs));
    localStorage.setItem('athletes_filters', JSON.stringify(this.athleteFilters));
    localStorage.setItem('athletes_orderBy', JSON.stringify(this.athleteOrderBy));
  }

  openAthletesSettingsDialog(): void {
    this.isAthletesSettingsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAthletesSettingsDialog(): void {
    this.isAthletesSettingsDialogOpen = false;
    this.cdr.markForCheck();
  }

  onAthleteSettingsChange(settings: { columns: ColumnConfig[]; filterConfigs: AthleteFilterConfig[] }): void {
    // Clear filter values for filters that were just hidden
    settings.filterConfigs.forEach((newFilter) => {
      const oldFilter = this.athleteFilterConfigs.find((f) => f.id === newFilter.id);
      if (oldFilter && oldFilter.visible && !newFilter.visible) {
        if (newFilter.id === 'gender') this.athleteFilters.genders = [];
        if (newFilter.id === 'birthYear') this.athleteFilters.birthYears = [];
      }
    });
    this.athleteColumns = settings.columns;
    this.athleteFilterConfigs = settings.filterConfigs;
    this.saveAthleteSettings();
    this.loadAthletes();
    this.cdr.markForCheck();
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
          genders: parsed.genders || [],
          birthYears: parsed.birthYears ?? [],
          clubs: parsed.clubs ?? [],
          years: parsed.years ?? [],
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

    const savedAthleteColumns = localStorage.getItem('athletes_columns');
    if (savedAthleteColumns) {
      try {
        const parsed = JSON.parse(savedAthleteColumns);
        this.athleteColumns = this.athleteColumns.map((col) => {
          const saved = parsed.find((p: ColumnConfig) => p.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading athlete column settings:', e);
      }
    }

    const savedAthleteFilterConfigs = localStorage.getItem('athletes_filterConfigs');
    if (savedAthleteFilterConfigs) {
      try {
        const parsed = JSON.parse(savedAthleteFilterConfigs);
        this.athleteFilterConfigs = this.athleteFilterConfigs.map((f) => {
          const saved = parsed.find((p: AthleteFilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading athlete filter config settings:', e);
      }
    }

    const savedAthleteFilters = localStorage.getItem('athletes_filters');
    if (savedAthleteFilters) {
      try {
        const parsed = JSON.parse(savedAthleteFilters);
        this.athleteFilters = {
          search: parsed.search || '',
          genders: parsed.genders || [],
          birthYears: parsed.birthYears || [],
        };
      } catch (e) {
        console.error('Error loading athlete filter values:', e);
      }
    }

    const savedAthleteOrderBy = localStorage.getItem('athletes_orderBy');
    if (savedAthleteOrderBy) {
      try {
        this.athleteOrderBy = JSON.parse(savedAthleteOrderBy);
      } catch (e) {
        console.error('Error loading athlete orderBy:', e);
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

    if (this.userRole === SystemRole.ClubAdmin && this.userClub?.uuid && this.userClub.type !== ScopeType.Internal) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    } else if (
      this.userRole === SystemRole.Coach &&
      this.hasClubAccess &&
      this.userClub?.uuid &&
      this.userClub.type !== ScopeType.Internal
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

          if (allAccreditations.length === 0) {
            this.error = this.translateService.instant('accreditations.page.export.noDataError');
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
                      acc.athlete?.gender === Gender.MALE
                        ? this.translateService.instant('accreditations.gender.male')
                        : acc.athlete?.gender === Gender.FEMALE
                          ? this.translateService.instant('accreditations.gender.female')
                          : '';
                    break;
                  case 'dateOfBirth':
                    row[col.label] = this.formatDateForExcel(
                      acc.athlete?.dateOfBirth,
                    );
                    break;
                  case 'clubShortName':
                    row[col.label] = acc.club?.shortName || '';
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
                    row[this.translateService.instant('accreditations.columns.insuranceFrom')] = this.formatDateForExcel(
                      acc.athlete?.insuranceFrom,
                    );
                    row[this.translateService.instant('accreditations.columns.insuranceTo')] = this.formatDateForExcel(
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
            XLSX.utils.book_append_sheet(wb, ws, this.translateService.instant('accreditations.page.export.sheetName'));
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            XLSX.writeFile(wb, `accreditations_${dateStr}.xlsx`);

            this.exporting = false;
            this.cdr.markForCheck();
          } catch (error) {
            console.error('Export error:', error);
            this.error = this.translateService.instant('accreditations.page.export.exportError');
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
      [AccreditationStatus.Active]: this.translateService.instant('accreditations.status.active'),
      [AccreditationStatus.PendingValidation]: this.translateService.instant('accreditations.status.requested'),
      [AccreditationStatus.PendingPhotoValidation]: this.translateService.instant('accreditations.status.pendingPhoto'),
      [AccreditationStatus.NewPhotoRequired]: this.translateService.instant('accreditations.status.newPhoto'),
      [AccreditationStatus.Expired]: this.translateService.instant('accreditations.status.expired'),
      [AccreditationStatus.Suspended]: this.translateService.instant('accreditations.status.suspended'),
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
    this.loadAccreditationBirthYearRange();
  }

  private loadClubs(): void {
    // If user can't see the club filter, they don't need the club list
    if (!this.showClubFilter) {
      this.allClubs = [];
      return;
    }

    fetchAllPages((skip, top) =>
      this.clubsService.getAllClubs(
        "type eq 'INTERNAL'",
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
    // Build minimal filter to satisfy club restrictions
    const filterParts: string[] = [];

    // Use userClub from component (fetched via getClubByAdminId/getClubByCoachId)
    // INTERNAL users don't need club restriction
    if (!this.showClubFilter && this.userClub?.uuid && this.userClub.type !== ScopeType.Internal) {
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

  private loadAccreditationBirthYearRange(): void {
    this.athletesService
      .getAllAthletes(undefined, undefined, ['dateOfBirth_asc'] as any, 1, 0)
      .pipe(catchError(() => of({ content: [] })), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const oldest = res.content?.[0]?.dateOfBirth;
        this.athletesService
          .getAllAthletes(undefined, undefined, ['dateOfBirth_desc'] as any, 1, 0)
          .pipe(catchError(() => of({ content: [] })), takeUntil(this.destroy$))
          .subscribe((res2: any) => {
            const youngest = res2.content?.[0]?.dateOfBirth;
            if (oldest && youngest) {
              const oldestYear = new Date(oldest).getFullYear();
              const youngestYear = new Date(youngest).getFullYear();
              this.availableAccreditationBirthYears = [];
              for (let y = youngestYear; y >= oldestYear; y--) {
                this.availableAccreditationBirthYears.push(y);
              }
            }
            this.cdr.markForCheck();
          });
      });
  }

}
