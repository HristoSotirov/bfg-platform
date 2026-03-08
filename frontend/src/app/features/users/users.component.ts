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
import { UsersService, UserDto, SystemRole } from '../../core/services/api';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { UsersFiltersComponent } from './components/users-filters/users-filters.component';
import { UserDetailsDialogComponent } from './components/user-details-dialog/user-details-dialog.component';
import { AddUserDialogComponent } from './components/add-user-dialog/add-user-dialog.component';
import { UserSettingsDialogComponent } from './components/user-settings-dialog/user-settings-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { MobileActionMenuComponent, MobileActionMenuItem } from '../../shared/components/mobile-action-menu/mobile-action-menu.component';
import * as XLSX from 'xlsx';

export interface UserColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface UserFilterConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface UserFilters {
  search: string;
  roles: string[]; // SystemRole values
  statuses: string[]; // 'true' for active, 'false' for inactive
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    UsersTableComponent,
    UsersFiltersComponent,
    UserDetailsDialogComponent,
    AddUserDialogComponent,
    UserSettingsDialogComponent,
    ButtonComponent,
    MobileActionMenuComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  users: UserDto[] = [];
  totalElements = 0;
  loading = false;
  error: string | null = null;

  userRole: SystemRole | null = null;

  filters: UserFilters = {
    search: '',
    roles: [],
    statuses: [],
  };
  orderBy: string[] = ['lastName_asc'];

  readonly pageSize = 50;
  currentSkip = 0;
  hasMore = true;

  columns: UserColumnConfig[] = [
    { id: 'firstName', label: 'Име', visible: true },
    { id: 'lastName', label: 'Фамилия', visible: true },
    { id: 'dateOfBirth', label: 'Дата на раждане', visible: true },
    { id: 'username', label: 'Потребителско име', visible: true },
    { id: 'email', label: 'Имейл', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'role', label: 'Роля', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'updatedAt', label: 'Променен на', visible: true },
  ];

  filterConfigs: UserFilterConfig[] = [
    { id: 'role', label: 'Роля', visible: true },
    { id: 'status', label: 'Статус', visible: true },
  ];

  isDetailsDialogOpen = false;
  isAddDialogOpen = false;
  isSettingsDialogOpen = false;

  selectedUser: UserDto | null = null;

  exporting = false;
  mobileMenuOpen = false;

  get mobileMenuItems(): MobileActionMenuItem[] {
    return [
      {
        label: 'Добавяне на потребител',
        action: () => this.openAddDialog(),
        visible: this.canAddUser,
      },
      {
        label: 'Експорт в Excel',
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
    private usersService: UsersService,
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

  get canAddUser(): boolean {
    return (
      this.userRole === 'APP_ADMIN' ||
      this.userRole === 'FEDERATION_ADMIN' ||
      this.userRole === 'CLUB_ADMIN'
    );
  }

  get canEditUser(): boolean {
    return (
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  private initializeUserContext(): void {
    const user = this.authService.currentUser;
    if (!user || user.roles.length === 0) {
      this.loadUsers();
      return;
    }

    this.userRole = user.roles[0] as SystemRole;
    this.loadUsers();
  }

  loadUsers(reset = true): void {
    if (reset) {
      this.currentSkip = 0;
      this.users = [];
      this.hasMore = true;
    }

    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];

    if (this.filters.roles.length > 0 && this.isFilterVisible('role')) {
      if (this.filters.roles.length === 1) {
        filterParts.push(`role eq '${this.filters.roles[0]}'`);
      } else {
        const roleConditions = this.filters.roles
          .map((r) => `role eq '${r}'`)
          .join(' or ');
        filterParts.push(`(${roleConditions})`);
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

    this.usersService
      .getAllUsers(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        this.pageSize,
        this.currentSkip,
        undefined,
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
            this.users = response.content || [];
          } else {
            this.users = [...this.users, ...(response.content || [])];
          }
          this.totalElements = response.totalElements || 0;
          this.hasMore = this.users.length < this.totalElements;
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
    this.loadUsers(false);
  }

  onFiltersChange(filters: UserFilters): void {
    this.filters = { ...filters };
    this.loadUsers();
  }

  onSearchChange(search: string): void {
    this.filters.search = search;
    this.loadUsers();
  }

  onSortChange(orderBy: string[]): void {
    this.orderBy = orderBy;
    this.loadUsers();
  }

  openDetailsDialog(user: UserDto): void {
    this.selectedUser = user;
    this.isDetailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedUser = null;
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
    columns: UserColumnConfig[];
    filterConfigs: UserFilterConfig[];
  }): void {
    const oldFilterConfigs = this.filterConfigs;
    const newFilterConfigs = data.filterConfigs;

    newFilterConfigs.forEach((newFilter) => {
      const oldFilter = oldFilterConfigs.find((f) => f.id === newFilter.id);
      if (oldFilter && oldFilter.visible && !newFilter.visible) {
        if (newFilter.id === 'role') this.filters.roles = [];
        if (newFilter.id === 'status') this.filters.statuses = [];
      } else if ((oldFilter && !oldFilter.visible && newFilter.visible) || (!oldFilter && newFilter.visible)) {
        if (newFilter.id === 'role') this.filters.roles = [];
        if (newFilter.id === 'status') this.filters.statuses = [];
      }
    });

    this.columns = data.columns;
    this.filterConfigs = data.filterConfigs;
    this.saveSettings();
    this.loadUsers();
    this.cdr.markForCheck();
  }

  private saveSettings(): void {
    localStorage.setItem('users_columns', JSON.stringify(this.columns));
    localStorage.setItem('users_filters', JSON.stringify(this.filterConfigs));
  }

  private loadSettings(): void {
    const savedColumns = localStorage.getItem('users_columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        this.columns = this.columns.map((col) => {
          const saved = parsed.find((p: UserColumnConfig) => p.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column settings:', e);
      }
    }

    const savedFilters = localStorage.getItem('users_filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        this.filterConfigs = this.filterConfigs.map((f) => {
          const saved = parsed.find((p: UserFilterConfig) => p.id === f.id);
          return saved ? { ...f, visible: saved.visible } : f;
        });
      } catch (e) {
        console.error('Error loading filter settings:', e);
      }
    }
  }

  onUserSaved(): void {
    this.loadUsers();
    this.closeDetailsDialog();
  }

  onUserAdded(): void {
    this.loadUsers();
    this.closeAddDialog();
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
        
        if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
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

    if (this.filters.roles.length > 0 && this.isFilterVisible('role')) {
      if (this.filters.roles.length === 1) {
        filterParts.push(`role eq '${this.filters.roles[0]}'`);
      } else {
        const roleConditions = this.filters.roles
          .map((r) => `role eq '${r}'`)
          .join(' or ');
        filterParts.push(`(${roleConditions})`);
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

    this.usersService
      .getAllUsers(
        filterString,
        this.filters.search || undefined,
        this.orderBy as any,
        1000, // Maximum allowed by backend
        0,
        undefined,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const visibleColumns = this.columns.filter((col) => col.visible);

          const data = (response.content || []).map((u) => {
            const row: any = {};

            visibleColumns.forEach((col) => {
              switch (col.id) {
                case 'firstName':
                  row[col.label] = u.firstName || '';
                  break;
                case 'lastName':
                  row[col.label] = u.lastName || '';
                  break;
                case 'dateOfBirth':
                  row[col.label] = this.formatDateForExcel(u.dateOfBirth);
                  break;
                case 'username':
                  row[col.label] = u.username || '';
                  break;
                case 'email':
                  row[col.label] = u.email || '';
                  break;
                case 'isActive':
                  row[col.label] = u.isActive ? 'Активен' : 'Неактивен';
                  break;
                case 'role':
                  row[col.label] = this.getRoleLabel(u.role);
                  break;
                case 'createdAt':
                  row[col.label] = this.formatDateForExcel(u.createdAt);
                  break;
                case 'updatedAt':
                  row[col.label] = this.formatDateForExcel(u.updatedAt);
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
                  
                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                    const excelDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                    if (!isNaN(excelDate.getTime())) {
                      const excelEpoch = new Date(Date.UTC(1899, 11, 30, 0, 0, 0, 0));
                      const excelSerial = (excelDate.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000);
                      cell.v = excelSerial;
                      cell.z = 'dd.mm.yyyy';
                      cell.t = 'n';
                      dateColumns.add(col);
                    }
                  }
                }
              }
            }
          }
          
          if (!ws['!cols']) ws['!cols'] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            if (dateColumns.has(col)) {
              ws['!cols'][col] = { wch: 12 };
            } else if (!ws['!cols'][col]) {
              ws['!cols'][col] = { wch: 15 };
            }
          }
          
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Потребители');
          const now = new Date();
          const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
          XLSX.writeFile(wb, `users_${dateStr}.xlsx`);

          this.exporting = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.exporting = false;
          this.cdr.markForCheck();
        },
      });
  }

  getRoleLabel(role: SystemRole | undefined): string {
    if (!role) return '-';
    const roleLabels: Record<SystemRole, string> = {
      APP_ADMIN: 'Администратор',
      FEDERATION_ADMIN: 'Администратор на федерацията',
      CLUB_ADMIN: 'Администратор на клуб',
      COACH: 'Треньор',
    };
    return roleLabels[role] || role;
  }

  private isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    return config?.visible ?? true;
  }
}

