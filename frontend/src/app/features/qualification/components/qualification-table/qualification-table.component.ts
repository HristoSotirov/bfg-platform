import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QualificationSchemeDto } from '../../../../core/services/api';
import { QualificationColumnConfig } from '../../qualification.component';

@Component({
  selector: 'app-qualification-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qualification-table.component.html',
  styleUrl: './qualification-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationTableComponent implements OnInit {
  @Input() schemes: QualificationSchemeDto[] = [];
  @Input() columns: QualificationColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<QualificationSchemeDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  get visibleColumns(): QualificationColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;

    const firstSort = this.orderBy[0];
    const parts = firstSort.split('_');
    if (parts.length === 2) {
      const direction = parts[1] as 'asc' | 'desc';
      const field = parts[0];
      this.currentSort = { column: field, direction };
    }
  }

  onRowClick(scheme: QualificationSchemeDto): void {
    this.rowClick.emit(scheme);
  }

  onSort(columnId: string): void {
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      isActive: 'isActive',
    };

    const sortField = sortFieldMap[columnId];
    if (!sortField) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };
    this.sortChange.emit([`${sortField}_${direction}`]);
  }

  isSortable(columnId: string): boolean {
    return ['name', 'isActive'].includes(columnId);
  }

  getCellValue(scheme: QualificationSchemeDto, columnId: string): string {
    switch (columnId) {
      case 'name':
        return scheme.name || '-';
      case 'laneCount':
        return scheme.laneCount?.toString() || '-';
      case 'isActive':
        return scheme.isActive ? 'Активен' : 'Неактивен';
      case 'createdAt':
        return this.formatDateTime(scheme.createdAt);
      case 'modifiedAt':
        return this.formatDateTime(scheme.modifiedAt);
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

  getStatusClass(scheme: QualificationSchemeDto): string {
    return scheme.isActive ? 'text-green-600' : 'text-red-600';
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
