import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserDto, SystemRole } from '../../../../core/services/api';
import { UserColumnConfig } from '../../users.component';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent implements OnInit {
  @Input() users: UserDto[] = [];
  @Input() columns: UserColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<UserDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  private roleLabels: Record<SystemRole, string> = {
    [SystemRole.AppAdmin]: 'Администратор',
    [SystemRole.FederationAdmin]: 'Администратор на федерацията',
    [SystemRole.ClubAdmin]: 'Администратор на клуб',
    [SystemRole.Coach]: 'Треньор',
  };

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;

    const sortFieldMap: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      username: 'username',
      role: 'role',
      createdAt: 'createdAt',
      modifiedAt: 'updatedAt',
    };

    const firstSort = this.orderBy[0];
    const parts = firstSort.split('_');
    if (parts.length === 2) {
      const direction = parts[1] as 'asc' | 'desc';
      const field = parts[0];
      const columnId = sortFieldMap[field];
      if (columnId) {
        this.currentSort = { column: columnId, direction };
      }
    }
  }

  get visibleColumns(): UserColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onRowClick(user: UserDto): void {
    this.rowClick.emit(user);
  }

  onSort(columnId: string): void {
    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };

    const sortFieldMap: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      username: 'username',
      role: 'role',
      createdAt: 'createdAt',
      updatedAt: 'modifiedAt',
    };

    const sortField = sortFieldMap[columnId];
    if (sortField) {
      this.sortChange.emit([`${sortField}_${direction}`]);
    }
  }

  getCellValue(user: UserDto, columnId: string): string {
    switch (columnId) {
      case 'firstName':
        return user.firstName || '-';
      case 'lastName':
        return user.lastName || '-';
      case 'dateOfBirth':
        return this.formatDate(user.dateOfBirth);
      case 'username':
        return user.username || '-';
      case 'email':
        return user.email || '-';
      case 'isActive':
        return user.isActive ? 'Активен' : 'Неактивен';
      case 'role':
        return this.getRoleLabel(user.role);
      case 'createdAt':
        return this.formatDateTime(user.createdAt);
      case 'updatedAt':
        return this.formatDateTime(user.updatedAt);
      default:
        return '-';
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  getStatusClass(user: UserDto): string {
    return user.isActive ? 'text-green-600' : 'text-red-600';
  }

  getRoleLabel(role: SystemRole | undefined): string {
    if (!role) return '-';
    return this.roleLabels[role] || role;
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 100;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold
    ) {
      if (this.hasMore && !this.loading) {
        this.loadMore.emit();
      }
    }
  }
}
