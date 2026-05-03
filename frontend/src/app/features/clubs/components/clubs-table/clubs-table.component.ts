import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDto, ScopeType } from '../../../../core/services/api';
import { ClubColumnConfig } from '../../clubs.component';

@Component({
  selector: 'app-clubs-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clubs-table.component.html',
  styleUrl: './clubs-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubsTableComponent implements OnInit {
  @Input() clubs: ClubDto[] = [];
  @Input() columns: ClubColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<ClubDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;

    const sortFieldMap: Record<string, string> = {
      shortName: 'shortName',
      name: 'name',
      cardPrefix: 'cardPrefix',
      isActive: 'isActive',
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

  get visibleColumns(): ClubColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onRowClick(club: ClubDto): void {
    this.rowClick.emit(club);
  }

  onSort(columnId: string): void {
    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };

    const sortFieldMap: Record<string, string> = {
      shortName: 'shortName',
      name: 'name',
      cardPrefix: 'cardPrefix',
      isActive: 'isActive',
      createdAt: 'createdAt',
      updatedAt: 'modifiedAt',
    };

    const sortField = sortFieldMap[columnId];
    if (sortField) {
      this.sortChange.emit([`${sortField}_${direction}`]);
    }
  }

  getCellValue(club: ClubDto, columnId: string): string {
    switch (columnId) {
      case 'shortName':
        return club.shortName || '-';
      case 'name':
        return club.name || '-';
      case 'cardPrefix':
        return club.cardPrefix || '-';
      case 'clubEmail':
        return club.clubEmail || '@';
      case 'clubAdminName':
        return club.clubAdminUser
          ? `${club.clubAdminUser.firstName || ''} ${club.clubAdminUser.lastName || ''}`.trim() ||
              '-'
          : '-';
      case 'type':
        return this.getScopeTypeLabel(club.type);
      case 'isActive':
        return club.isActive ? 'Активен' : 'Неактивен';
      case 'createdAt':
        return this.formatDateTime((club as any).createdAt);
      case 'updatedAt':
        return this.formatDateTime((club as any).updatedAt);
      default:
        return '-';
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

  getStatusClass(club: ClubDto): string {
    return club.isActive ? 'text-green-600' : 'text-red-600';
  }

  getScopeTypeLabel(scopeType: string | undefined): string {
    if (!scopeType) return '-';
    const labels: Record<string, string> = {
      [ScopeType.Internal]: 'Вътрешен',
      [ScopeType.External]: 'Външен',
      [ScopeType.National]: 'Национален',
    };
    return labels[scopeType] ?? scopeType;
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
