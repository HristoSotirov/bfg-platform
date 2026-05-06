import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { ScopeVisibilityService } from '../../core/services/scope-visibility.service';
import {
  ClubsService,
  ClubCoachesService,
  ScopeType,
} from '../../core/services/api';
import { ClubDto } from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { ClubsTableComponent } from './components/clubs-table/clubs-table.component';
import { ClubsFiltersComponent } from './components/clubs-filters/clubs-filters.component';
import { AddClubDialogComponent } from './components/add-club-dialog/add-club-dialog.component';
import { ClubMigrationDialogComponent } from './components/club-migration-dialog/club-migration-dialog.component';
import { ClubSettingsDialogComponent } from './components/club-settings-dialog/club-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import {
  MobileActionMenuComponent,
  MobileActionMenuItem,
} from '../../shared/components/mobile-action-menu/mobile-action-menu.component';
import * as XLSX from 'xlsx';

export interface ClubColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ClubFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ClubFilters {
  search: string;
  statuses: string[]; // 'true' for active, 'false' for inactive
  scopeTypes: string[]; // INTERNAL, EXTERNAL, NATIONAL – only for APP_ADMIN/FED_ADMIN, from cache only
}

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    ClubsTableComponent,
    ClubsFiltersComponent,
    AddClubDialogComponent,
    ClubMigrationDialogComponent,
    ClubSettingsDialogComponent,
    ButtonComponent,
    MobileActionMenuComponent,
  ],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  clubs: ClubDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;
  userClubId: string | null = null;

  filters: ClubFilters = {
    search: '',
    statuses: [],
    scopeTypes: [],
  };
  orderBy: string[] = ['cardPrefix_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: ClubColumnConfig[] = [];

  filterConfigs: ClubFilterConfig[] = [];

  isAddDialogOpen = false;
  isMigrationDialogOpen = false;
  isSettingsDialogOpen = false;

  exporting = false;
  mobileMenuOpen = false;

  get mobileMenuItems(): MobileActionMenuItem[] {
    return [
      {
        label: this.translateService.instant('clubs.addButton'),
        action: () => this.openAddDialog(),
        visible: this.canAddClub,
      },
      {
        label: this.translateService.instant('common.migration'),
        action: () => this.openMigrationDialog(),
        visible: this.canMigrate,
      },
      {
        label: this.translateService.instant('common.exportExcel'),
        action: () => this.exportToExcel(),
        disabled: this.exporting || this.totalElements === 0,
      },
    ];
  }

  onMobileMenuToggle(isOpen: boolean): void {
    this.mobileMenuOpen = isOpen;
  }

  constructor(
    private authService: AuthService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private scopeVisibility: ScopeVisibilityService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initColumns();
    this.initFilterConfigs();
    this.loadSettings();
    this.initializeUserContext();

    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.initColumns();
      this.initFilterConfigs();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initColumns(): void {
    const t = (key: string) => this.translateService.instant(key);
    const savedColumns = this.columns;
    this.columns = [
      { id: 'shortName', label: t('clubs.table.columns.shortName'), visible: true },
      { id: 'name', label: t('clubs.table.columns.name'), visible: true },
      { id: 'cardPrefix', label: t('clubs.table.columns.cardPrefix'), visible: true },
      { id: 'clubEmail', label: t('clubs.table.columns.clubEmail'), visible: true },
      { id: 'clubAdminName', label: t('clubs.table.columns.clubAdminName'), visible: true },
      { id: 'isActive', label: t('clubs.table.columns.isActive'), visible: true },
      { id: 'type', label: t('clubs.table.columns.type'), visible: true },
      { id: 'createdAt', label: t('clubs.table.columns.createdAt'), visible: true },
      { id: 'updatedAt', label: t('clubs.table.columns.updatedAt'), visible: true },
    ];
    // Preserve visibility from previous state
    if (savedColumns.length > 0) {
      this.columns = this.columns.map((col) => {
        const prev = savedColumns.find((c) => c.id === col.id);
        return prev ? { ...col, visible: prev.visible } : col;
      });
    }
  }

  private initFilterConfigs(): void {
    const t = (key: string) => this.translateService.instant(key);
    const savedConfigs = this.filterConfigs;
    this.filterConfigs = [
      { id: 'status', label: t('clubs.filterConfigs.status'), visible: true },
    ];
    // Preserve visibility from previous state
    if (savedConfigs.length > 0) {
      this.filterConfigs = this.filterConfigs.map((f) => {
        const prev = savedConfigs.find((c) => c.id === f.id);
        return prev ? { ...f, visible: prev.visible } : f;
      });
    }
  }

  get canAddClub(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get canEditClub(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get canMigrate(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get showNoClubMessage(): boolean {
    return (
      (this.userRole === SystemRole.ClubAdmin || this.userRole === SystemRole.Coach) &&
      !this.userClubId
    );
  }

  get showScopeFeatures(): boolean {
    return this.scopeVisibility.canViewTypeField();
  }

  private applyRoleBasedVisibility(): void {
    if (this.showScopeFeatures) {
      if (!this.filterConfigs.find((f) => f.id === 'type')) {
        this.filterConfigs = [
          ...this.filterConfigs,
          { id: 'type', label: this.translateService.instant('clubs.filterConfigs.type'), visible: true },
        ];
      }
      const scopeCol = this.columns.find((c) => c.id === 'type');
      if (scopeCol) scopeCol.visible = true;
    } else {
      this.filterConfigs = this.filterConfigs.filter(
        (f) => f.id !== 'type',
      );
      const scopeCol = this.columns.find((c) => c.id === 'type');
      if (scopeCol) scopeCol.visible = false;
      this.filters.scopeTypes = [];
    }
  }

  canManageCoachesForClub(clubId: string | undefined): boolean {
    if (!clubId) return false;
    if (this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin) return true;
    if (this.userRole === SystemRole.ClubAdmin && this.userClubId === clubId) return true;
    return false;
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (!user || user.roles.length === 0) {
      this.applyRoleBasedVisibility();
      this.loadClubs();
      return;
    }

    this.userRole = user.roles[0] as SystemRole;
    this.applyRoleBasedVisibility();

    if (this.userRole === SystemRole.ClubAdmin) {
      this.clubsService
        .getClubByAdminId(user.uuid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (club) => {
            this.userClubId = club?.uuid || null;
            this.loadClubs();
          },
          error: () => this.loadClubs(),
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
            this.userClubId = club?.uuid || null;
            this.loadClubs();
          },
          error: () => this.loadClubs(),
        });
    } else {
      this.loadClubs();
    }
  }

  loadClubs(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.clubs = [];
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

    // Type filter - use user's selection if visible
    if (this.showScopeFeatures) {
      if (
        this.filters.scopeTypes?.length > 0 &&
        this.isFilterVisible('type')
      ) {
        if (this.filters.scopeTypes.length === 1) {
          filterParts.push(`type eq '${this.filters.scopeTypes[0]}'`);
        } else {
          const scopeConditions = this.filters.scopeTypes
            .map((s) => `type eq '${s}'`)
            .join(' or ');
          filterParts.push(`(${scopeConditions})`);
        }
      }
    }

    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    this.clubsService
      .getAllClubs(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        this.pageSize,
        this.currentSkip,
        ['clubAdminUser'] as Array<'clubAdminUser'>,
      )
      .pipe(
        timeout(30000),
        catchError((err) => {
          this.error = err?.error?.message || this.translateService.instant('common.errorLoading');
          this.loading = false;
          return of({ content: [], totalElements: 0 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          if (reset) {
            this.clubs = response.content || [];
          } else {
            this.clubs = [...this.clubs, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.clubs.length < this.totalElements;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message || this.translateService.instant('common.errorLoading');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadMore(): void {
    if (!this.hasMore || this.loading) return;
    this.currentSkip += this.pageSize;
    this.loadClubs(false);
  }

  onFiltersChange(filters: ClubFilters): void {
    this.filters = { ...filters };
    this.saveFilters();
    this.loadClubs();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters();
    this.loadClubs();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters();
    this.loadClubs();
  }

  openDetailsDialog(club: ClubDto): void {
    this.router.navigate(['/clubs', club.uuid]);
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
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

  openSettingsDialog(): void {
    this.isSettingsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeSettingsDialog(): void {
    this.isSettingsDialogOpen = false;
    this.cdr.markForCheck();
  }

  onSettingsChange(data: {
    columns: ClubColumnConfig[];
    filterConfigs: ClubFilterConfig[];
  }): void {
    const oldFilterConfigs = this.filterConfigs;
    const newFilterConfigs = data.filterConfigs;

    newFilterConfigs.forEach((newFilter) => {
      const oldFilter = oldFilterConfigs.find((f) => f.id === newFilter.id);
      if (oldFilter && oldFilter.visible && !newFilter.visible) {
        if (newFilter.id === 'status') this.filters.statuses = [];
        if (newFilter.id === 'type') this.filters.scopeTypes = [];
      } else if (
        (oldFilter && !oldFilter.visible && newFilter.visible) ||
        (!oldFilter && newFilter.visible)
      ) {
        if (newFilter.id === 'status') this.filters.statuses = [];
        if (newFilter.id === 'type') this.filters.scopeTypes = [];
      }
    });

    this.columns = data.columns;
    this.filterConfigs = data.filterConfigs;
    this.saveSettings();
    this.loadClubs();
    this.cdr.markForCheck();
  }

  private saveSettings(): void {
    localStorage.setItem('clubs_columns', JSON.stringify(this.columns));
    localStorage.setItem(
      'clubs_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem('clubs_filterValues', JSON.stringify(this.filters));
    localStorage.setItem('clubs_orderBy', JSON.stringify(this.orderBy));
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('clubs_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find((p: ClubColumnConfig) => p.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem('clubs_filterConfigs');
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: ClubFilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter config settings:', e);
      }
    }

    // Also check legacy key for backwards compatibility
    const legacyFilters = localStorage.getItem('clubs_filters');
    if (legacyFilters && !savedFilterConfigs) {
      try {
        const parsed = JSON.parse(legacyFilters);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: ClubFilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        // ignore
      }
    }

    this.loadFilters();
  }

  private loadFilters(): void {
    const savedFilters = localStorage.getItem('clubs_filterValues');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filters = {
          search: parsed.search || '',
          statuses: parsed.statuses || [],
          scopeTypes: parsed.scopeTypes || [],
        };
      } catch (e) {
        console.error('Error loading filter values:', e);
      }
    }

    // Also check legacy key for backwards compatibility
    const legacyScopeTypes = localStorage.getItem('clubs_scope_types');
    if (legacyScopeTypes && !savedFilters) {
      try {
        const parsed = JSON.parse(legacyScopeTypes);
        if (Array.isArray(parsed)) {
          this.filters.scopeTypes = parsed;
        }
      } catch {
        // ignore
      }
    }

    const savedOrderBy = localStorage.getItem('clubs_orderBy');
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

  onClubAdded(): void {
    this.loadClubs();
    this.closeAddDialog();
  }

  onMigrationComplete(): void {
    this.loadClubs();
    this.closeMigrationDialog();
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
    this.exporting = true;
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
    if (
      this.filters.scopeTypes?.length > 0 &&
      this.isFilterVisible('type')
    ) {
      if (this.filters.scopeTypes.length === 1) {
        filterParts.push(`type eq '${this.filters.scopeTypes[0]}'`);
      } else {
        const scopeConditions = this.filters.scopeTypes
          .map((s) => `type eq '${s}'`)
          .join(' or ');
        filterParts.push(`(${scopeConditions})`);
      }
    }
    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    fetchAllPages((skip, top) =>
      this.clubsService.getAllClubs(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        top,
        skip,
        ['clubAdminUser'] as Array<'clubAdminUser'>,
      ) as any
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clubs: any[]) => {
          const visibleColumns = this.columns.filter((col) => col.visible);

          const data = clubs.map((c) => {
            const row: any = {};

            visibleColumns.forEach((col) => {
              switch (col.id) {
                case 'shortName':
                  row[col.label] = c.shortName || '';
                  break;
                case 'name':
                  row[col.label] = c.name || '';
                  break;
                case 'type':
                  row[col.label] = c.type
                    ? ({
                        [ScopeType.Internal]: this.translateService.instant('clubs.scopeTypes.internal'),
                        [ScopeType.External]: this.translateService.instant('clubs.scopeTypes.external'),
                        [ScopeType.National]: this.translateService.instant('clubs.scopeTypes.national'),
                      } as Record<string, string>)[c.type] ?? c.type
                    : '';
                  break;
                case 'cardPrefix':
                  row[col.label] = c.cardPrefix || '';
                  break;
                case 'clubEmail':
                  row[col.label] = c.clubEmail || '';
                  break;
                case 'clubAdminName':
                  row[col.label] =
                    (c.clubAdminUser
                      ? `${c.clubAdminUser.firstName || ''} ${c.clubAdminUser.lastName || ''}`.trim()
                      : '') || '';
                  break;
                case 'isActive':
                  row[col.label] = c.isActive ? this.translateService.instant('common.active') : this.translateService.instant('common.inactive');
                  break;
                case 'createdAt':
                  row[col.label] = this.formatDateForExcel(c.createdAt);
                  break;
                case 'updatedAt':
                  row[col.label] = this.formatDateForExcel(c.updatedAt);
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
          XLSX.utils.book_append_sheet(wb, ws, this.translateService.instant('clubs.export.sheetName'));
          const now = new Date();
          const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
          XLSX.writeFile(wb, `clubs_${dateStr}.xlsx`);

          this.exporting = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.exporting = false;
          this.cdr.markForCheck();
        },
      });
  }

  private isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    return config?.visible ?? true;
  }
}
