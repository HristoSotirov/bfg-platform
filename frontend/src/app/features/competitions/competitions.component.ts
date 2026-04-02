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
  isTemplate: string[];
  statuses: string[];
}

@Component({
  selector: 'app-competitions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
    isTemplate: [],
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: CompetitionColumnConfig[] = [
    { id: 'shortName', label: 'Кратко име', visible: true },
    { id: 'name', label: 'Име', visible: true },
    { id: 'isTemplate', label: 'Шаблон', visible: true },
    { id: 'season', label: 'Сезон', visible: true },
    { id: 'status', label: 'Статус', visible: true },
    { id: 'startDate', label: 'Начална дата', visible: true },
    { id: 'endDate', label: 'Крайна дата', visible: false },
    { id: 'location', label: 'Място', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: false },
    { id: 'modifiedAt', label: 'Променен на', visible: false },
  ];

  filterConfigs: CompetitionFilterConfig[] = [
    { id: 'isTemplate', label: 'Тип', visible: true },
    { id: 'status', label: 'Статус', visible: true },
  ];

  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  constructor(
    private authService: AuthService,
    private competitionsService: CompetitionsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.initializeUserContext();
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

    if (this.filters.isTemplate.length > 0 && this.isFilterVisible('isTemplate')) {
      if (this.filters.isTemplate.length === 1) {
        filterParts.push(`isTemplate eq ${this.filters.isTemplate[0]}`);
      }
    }

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
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
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
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
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
          isTemplate: parsed.isTemplate || [],
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
