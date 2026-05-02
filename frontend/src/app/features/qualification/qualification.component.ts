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
import { HeaderComponent } from '../../layout/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { QualificationSchemesService } from '../../core/services/api';
import { QualificationSchemeDto } from '../../core/services/api';
import { SystemRole } from '../../core/models/navigation.model';
import { QualificationTableComponent } from './components/qualification-table/qualification-table.component';
import { QualificationDetailsDialogComponent } from './components/qualification-details-dialog/qualification-details-dialog.component';
import { AddQualificationDialogComponent } from './components/add-qualification-dialog/add-qualification-dialog.component';
import { QualificationSettingsDialogComponent } from './components/qualification-settings-dialog/qualification-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { QualificationFiltersComponent } from './components/qualification-filters/qualification-filters.component';

export interface QualificationColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface QualificationFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface QualificationFilters {
  search: string;
  statuses: string[];
}

@Component({
  selector: 'app-qualification',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    QualificationTableComponent,
    QualificationDetailsDialogComponent,
    AddQualificationDialogComponent,
    QualificationSettingsDialogComponent,
    ButtonComponent,
    QualificationFiltersComponent,
  ],
  templateUrl: './qualification.component.html',
  styleUrl: './qualification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  schemes: QualificationSchemeDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;

  filters: QualificationFilters = {
    search: '',
    statuses: [],
  };
  orderBy: string[] = ['name_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: QualificationColumnConfig[] = [
    { id: 'name', label: 'Име', visible: true },
    { id: 'laneCount', label: 'Коридори', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  filterConfigs: QualificationFilterConfig[] = [
    { id: 'status', label: 'Статус', visible: true },
  ];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  selectedScheme: QualificationSchemeDto | null = null;

  constructor(
    private authService: AuthService,
    private schemesService: QualificationSchemesService,
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

    this.schemesService
      .getAllQualificationSchemes(
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
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
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

  onFiltersChange(filters: QualificationFilters): void {
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

  openDetailsDialog(scheme: QualificationSchemeDto): void {
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
    columns: QualificationColumnConfig[];
    filterConfigs: QualificationFilterConfig[];
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
    this.loadSchemes();
  }

  private saveSettings(): void {
    localStorage.setItem(
      'qualification_columns',
      JSON.stringify(this.columns),
    );
    localStorage.setItem(
      'qualification_filterConfigs',
      JSON.stringify(this.filterConfigs),
    );
  }

  private saveFilters(): void {
    localStorage.setItem(
      'qualification_filterValues',
      JSON.stringify(this.filters),
    );
    localStorage.setItem(
      'qualification_orderBy',
      JSON.stringify(this.orderBy),
    );
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('qualification_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find(
            (p: QualificationColumnConfig) => p.id === col.id,
          );
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilterConfigs = localStorage.getItem(
      'qualification_filterConfigs',
    );
    if (savedFilterConfigs) {
      try {
        const parsed = JSON.parse(savedFilterConfigs);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find(
            (p: QualificationFilterConfig) => p.id === f.id,
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
    const savedFilters = localStorage.getItem('qualification_filterValues');
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

    const savedOrderBy = localStorage.getItem('qualification_orderBy');
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
