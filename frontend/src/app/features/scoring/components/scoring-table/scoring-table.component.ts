import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoringSchemeDto } from '../../../../core/services/api';
import { ScoringColumnConfig } from '../../scoring.component';

@Component({
  selector: 'app-scoring-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scoring-table.component.html',
  styleUrl: './scoring-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringTableComponent implements OnInit {
  @Input() schemes: ScoringSchemeDto[] = [];
  @Input() columns: ScoringColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<ScoringSchemeDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
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

  get visibleColumns(): ScoringColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onRowClick(scheme: ScoringSchemeDto): void {
    this.rowClick.emit(scheme);
  }

  onSort(columnId: string): void {
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      isActive: 'isActive',
    };

    if (!sortFieldMap[columnId]) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };

    const sortField = sortFieldMap[columnId];
    if (sortField) {
      this.sortChange.emit([`${sortField}_${direction}`]);
    }
  }

  getCellValue(scheme: ScoringSchemeDto, columnId: string): string {
    switch (columnId) {
      case 'name':
        return scheme.name || '-';
      case 'scoringType':
        return this.getScoringTypeLabel(scheme.scoringType);
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

  getScoringTypeLabel(scoringType: string | undefined): string {
    if (!scoringType) return '-';
    const labels: Record<string, string> = {
      FIXED: 'Фиксирано',
      OFFSET_FROM_END: 'От края',
    };
    return labels[scoringType] ?? scoringType;
  }

  getStatusClass(scheme: ScoringSchemeDto): string {
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
