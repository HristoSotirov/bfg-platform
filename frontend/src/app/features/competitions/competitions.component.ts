import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import {
  CompetitionsService,
  CompetitionDto,
} from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { CompetitionsTableComponent } from './components/competitions-table/competitions-table.component';
import { AddCompetitionDialogComponent } from './components/add-competition-dialog/add-competition-dialog.component';
import { CompetitionSettingsDialogComponent } from './components/competition-settings-dialog/competition-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CompetitionsFiltersComponent } from './components/competitions-filters/competitions-filters.component';

export interface CompetitionColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface CompetitionFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface CompetitionFilters {
  search: string;
  statuses: string[];
}

@Component({
  selector: 'app-competitions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    CompetitionsTableComponent,
    AddCompetitionDialogComponent,
    CompetitionSettingsDialogComponent,
    ButtonComponent,
    CompetitionsFiltersComponent,
  ],
  templateUrl: './competitions.component.html',
  styleUrl: './competitions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  competitions: CompetitionDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;

  filters: CompetitionFilters = {
    search: '',
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: CompetitionColumnConfig[] = [];

  filterConfigs: CompetitionFilterConfig[] = [];

  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  constructor(
    private authService: AuthService,
    private competitionsService: CompetitionsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initColumns();
    this.loadSettings();
    this.initializeUserContext();
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.initColumns();
      this.cdr.markForCheck();
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

  private initColumns(): void {
    const t = (key: string) => this.translate.instant(key);
    const defaultColumns: CompetitionColumnConfig[] = [
      { id: 'shortName', label: t('competitions.columns.shortName'), visible: true },
      { id: 'name', label: t('competitions.columns.name'), visible: true },
      { id: 'status', label: t('competitions.columns.status'), visible: true },
      { id: 'startDate', label: t('competitions.columns.startDate'), visible: true },
      { id: 'endDate', label: t('competitions.columns.endDate'), visible: false },
      { id: 'location', label: t('competitions.columns.location'), visible: true },
      { id: 'createdAt', label: t('competitions.columns.createdAt'), visible: false },
      { id: 'modifiedAt', label: t('competitions.columns.modifiedAt'), visible: false },
    ];
    // Preserve visibility settings
    if (this.columns.length > 0) {
      this.columns = defaultColumns.map((col) => {
        const existing = this.columns.find((c) => c.id === col.id);
        return existing ? { ...col, visible: existing.visible } : col;
      });
    } else {
      this.columns = defaultColumns;
    }
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }
    this.loadCompetitions();
  }

  loadCompetitions(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.competitions = [];
      this.hasMore = true;
    }

    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

    const filterString =
      filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    this.competitionsService
      .getAllCompetitions(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        this.pageSize,
        this.currentSkip,
      )
      .pipe(
        timeout(30000),
        catchError((err) => {
          this.error = err?.error?.message || this.translate.instant('competitions.page.loadError');
          this.loading = false;
          return of({ content: [], totalElements: 0 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          if (reset) {
            this.competitions = response.content || [];
          } else {
            this.competitions = [...this.competitions, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.competitions.length < this.totalElements;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message || this.translate.instant('competitions.page.loadError');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadMore(): void {
    if (!this.hasMore || this.loading) return;
    this.currentSkip += this.pageSize;
    this.loadCompetitions(false);
  }

  onFiltersChange(filters: CompetitionFilters): void {
    this.filters = { ...filters };
    this.saveFilters();
    this.loadCompetitions();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.saveFilters();
    this.loadCompetitions();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.saveFilters();
    this.loadCompetitions();
  }

  openDetailsPage(competition: CompetitionDto): void {
    this.router.navigate(['/competitions', competition.uuid]);
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
    this.cdr.markForCheck();
  }

  onCompetitionAdded(): void {
    this.loadCompetitions();
    this.closeAddDialog();
  }

  openSettingsDialog(): void {
    this.isSettingsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeSettingsDialog(): void {
    this.isSettingsDialogOpen = false;
    this.cdr.markForCheck();
  }

  onSettingsChange(event: { columns: CompetitionColumnConfig[]; filterConfigs: CompetitionFilterConfig[] }): void {
    this.columns = event.columns;
    this.filterConfigs = event.filterConfigs;
    localStorage.setItem('competitions_columns', JSON.stringify(this.columns));
    localStorage.setItem('competitions_filterConfigs', JSON.stringify(this.filterConfigs));
    this.loadCompetitions();
  }

  private saveFilters(): void {
    localStorage.setItem('competitions_filterValues', JSON.stringify(this.filters));
    localStorage.setItem('competitions_orderBy', JSON.stringify(this.orderBy));
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('competitions_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find((p: CompetitionColumnConfig) => p.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem('competitions_filterConfigs');
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: CompetitionFilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter config settings:', e);
      }
    }

    const savedFilters = localStorage.getItem('competitions_filterValues');
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

    const savedOrderBy = localStorage.getItem('competitions_orderBy');
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
