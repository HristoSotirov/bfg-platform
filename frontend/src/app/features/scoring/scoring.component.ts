import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import {
  ScoringSchemesService,
  ScoringSchemeDto,
} from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { ScoringTableComponent } from './components/scoring-table/scoring-table.component';
import { ScoringDetailsDialogComponent } from './components/scoring-details-dialog/scoring-details-dialog.component';
import { AddScoringDialogComponent } from './components/add-scoring-dialog/add-scoring-dialog.component';
import { ScoringSettingsDialogComponent } from './components/scoring-settings-dialog/scoring-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ScoringFiltersComponent } from './components/scoring-filters/scoring-filters.component';

export interface ScoringColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ScoringFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ScoringFilters {
  search: string;
  scoringTypes: string[];
  statuses: string[];
}

@Component({
  selector: 'app-scoring',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    ScoringTableComponent,
    ScoringDetailsDialogComponent,
    AddScoringDialogComponent,
    ScoringSettingsDialogComponent,
    ButtonComponent,
    ScoringFiltersComponent,
  ],
  templateUrl: './scoring.component.html',
  styleUrl: './scoring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  schemes: ScoringSchemeDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;

  filters: ScoringFilters = {
    search: '',
    scoringTypes: [],
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: ScoringColumnConfig[] = [];

  filterConfigs: ScoringFilterConfig[] = [];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  selectedScheme: ScoringSchemeDto | null = null;

  constructor(
    private authService: AuthService,
    private scoringSchemesService: ScoringSchemesService,
    private cdr: ChangeDetectorRef,
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

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }
    this.loadSchemes();
  }

  loadSchemes(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.schemes = [];
      this.hasMore = true;
    }

    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

    if (this.filters.scoringTypes.length > 0 && this.isFilterVisible('scoringType')) {
      if (this.filters.scoringTypes.length === 1) {
        filterParts.push(`scoringType eq '${this.filters.scoringTypes[0]}'`);
      } else {
        const typeConditions = this.filters.scoringTypes
          .map((t) => `scoringType eq '${t}'`)
          .join(' or ');
        filterParts.push(`(${typeConditions})`);
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

    this.scoringSchemesService
      .getAllScoringSchemes(
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
            this.schemes = response.content || [];
          } else {
            this.schemes = [...this.schemes, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.schemes.length < this.totalElements;
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
    this.loadSchemes(false);
  }

  onFiltersChange(filters: ScoringFilters): void {
    this.filters = { ...filters };
    this.saveFilters();
    this.loadSchemes();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters();
    this.loadSchemes();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters();
    this.loadSchemes();
  }

  openDetailsDialog(scheme: ScoringSchemeDto): void {
    this.selectedScheme = scheme;
    this.isDetailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedScheme = null;
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
    columns: ScoringColumnConfig[];
    filterConfigs: ScoringFilterConfig[];
  }): void {
    this.columns = data.columns;
    this.filterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  onSchemeAdded(): void {
    this.loadSchemes();
    this.closeAddDialog();
  }

  onSchemeSaved(): void {
    if (this.selectedScheme?.uuid) {
      this.scoringSchemesService
        .getScoringSchemeByUuid(this.selectedScheme.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedScheme) => {
            this.selectedScheme = updatedScheme;
            this.cdr.markForCheck();
          },
        });
    }
    this.loadSchemes();
  }

  private initTranslatedLabels(): void {
    this.columns = [
      { id: 'name', label: this.translate.instant('scoring.table.columns.name'), visible: true },
      { id: 'scoringType', label: this.translate.instant('scoring.table.columns.scoringType'), visible: true },
      { id: 'isActive', label: this.translate.instant('scoring.table.columns.isActive'), visible: true },
      { id: 'createdAt', label: this.translate.instant('scoring.table.columns.createdAt'), visible: true },
      { id: 'modifiedAt', label: this.translate.instant('scoring.table.columns.modifiedAt'), visible: true },
    ];
    this.filterConfigs = [
      { id: 'scoringType', label: this.translate.instant('scoring.filterConfigs.scoringType'), visible: true },
      { id: 'status', label: this.translate.instant('scoring.filterConfigs.status'), visible: true },
    ];
    this.loadSettings();
  }

  private saveSettings(): void {
    localStorage.setItem('scoring_columns', JSON.stringify(this.columns));
    localStorage.setItem(
      'scoring_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem(
      'scoring_filterValues',
      JSON.stringify(this.filters),
    );
    localStorage.setItem(
      'scoring_orderBy',
      JSON.stringify(this.orderBy),
    );
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('scoring_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find(
            (p: ScoringColumnConfig) => p.id === col.id,
          );
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem('scoring_filterConfigs');
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find(
            (p: ScoringFilterConfig) => p.id === f.id,
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
    const savedFilters = localStorage.getItem('scoring_filterValues');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filters = {
          search: parsed.search || '',
          scoringTypes: parsed.scoringTypes || [],
          statuses: parsed.statuses || [],
        };
      } catch (e) {
        console.error('Error loading filter values:', e);
      }
    }

    const savedOrderBy = localStorage.getItem('scoring_orderBy');
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
