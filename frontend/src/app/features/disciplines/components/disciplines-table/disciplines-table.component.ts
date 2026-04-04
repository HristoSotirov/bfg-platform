import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisciplineDefinitionDto } from '../../../../core/services/api';
import { DisciplineColumnConfig } from '../../disciplines.component';

@Component({
  selector: 'app-disciplines-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disciplines-table.component.html',
  styleUrl: './disciplines-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplinesTableComponent implements OnInit {
  @Input() disciplines: DisciplineDefinitionDto[] = [];
  @Input() columns: DisciplineColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];
  @Input() groupMap: Record<string, string> = {};

  @Output() rowClick = new EventEmitter<DisciplineDefinitionDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;

    const sortFieldMap: Record<string, string> = {
      name: 'name',
      shortName: 'shortName',
      isActive: 'isActive',
      createdAt: 'createdAt',
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

  get visibleColumns(): DisciplineColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onRowClick(discipline: DisciplineDefinitionDto): void {
    this.rowClick.emit(discipline);
  }

  onSort(columnId: string): void {
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      shortName: 'shortName',
      isActive: 'isActive',
      createdAt: 'createdAt',
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

  getCellValue(discipline: DisciplineDefinitionDto, columnId: string): string {
    switch (columnId) {
      case 'competitionGroup':
        return discipline.competitionGroupId
          ? (this.groupMap[discipline.competitionGroupId] || discipline.competitionGroupId)
          : '-';
      case 'name':
        return discipline.name || '-';
      case 'shortName':
        return discipline.shortName || '-';
      case 'boatClass':
        return discipline.boatClass || '-';
      case 'crewSize':
        return discipline.crewSize != null ? String(discipline.crewSize) : '-';
      case 'maxCrewFromTransfer':
        return discipline.maxCrewFromTransfer != null ? String(discipline.maxCrewFromTransfer) : '-';
      case 'hasCoxswain':
        return discipline.hasCoxswain ? 'Да' : 'Не';
      case 'isLightweight':
        return discipline.isLightweight ? 'Да' : 'Не';
      case 'distanceMeters':
        return discipline.distanceMeters != null ? String(discipline.distanceMeters) : '-';
      case 'isActive':
        return discipline.isActive ? 'Активен' : 'Неактивен';
      case 'createdAt':
        return this.formatDateTime(discipline.createdAt);
      case 'modifiedAt':
        return this.formatDateTime(discipline.modifiedAt);
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

  getStatusClass(discipline: DisciplineDefinitionDto): string {
    return discipline.isActive ? 'text-green-600' : 'text-red-600';
  }

  isSortable(columnId: string): boolean {
    const sortableColumns = ['name', 'shortName', 'isActive', 'createdAt'];
    return sortableColumns.includes(columnId);
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
