import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CompetitionGroupDefinitionDto,
  CompetitionGroupGender,
} from '../../../../core/services/api';
import { ColumnConfig } from '../../competition-groups.component';

@Component({
  selector: 'app-competition-groups-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './competition-groups-table.component.html',
  styleUrl: './competition-groups-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionGroupsTableComponent implements OnInit {
  @Input() groups: CompetitionGroupDefinitionDto[] = [];
  @Input() columns: ColumnConfig[] = [];
  @Input() groupLookup: Record<string, string> = {};
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<CompetitionGroupDefinitionDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  get visibleColumns(): ColumnConfig[] {
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

  onRowClick(group: CompetitionGroupDefinitionDto): void {
    this.rowClick.emit(group);
  }

  onSort(columnId: string): void {
    const sortableColumns: Record<string, string> = {
      name: 'name',
      shortName: 'shortName',
      isActive: 'isActive',
    };

    const sortField = sortableColumns[columnId];
    if (!sortField) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };
    this.sortChange.emit([`${sortField}_${direction}`]);
  }

  isSortable(columnId: string): boolean {
    return ['name', 'shortName', 'isActive'].includes(columnId);
  }

  getCellValue(group: CompetitionGroupDefinitionDto, columnId: string): string {
    switch (columnId) {
      case 'name':
        return group.name || '-';
      case 'shortName':
        return group.shortName || '-';
      case 'gender':
        return this.getGenderLabel(group.gender);
      case 'minAge':
        return group.minAge != null ? String(group.minAge) : '-';
      case 'maxAge':
        return group.maxAge != null ? String(group.maxAge) : '-';
      case 'transferFromGroupId':
        return group.transferFromGroupId ? (this.groupLookup[group.transferFromGroupId] || group.transferFromGroupId) : '-';
      case 'minCrewForTransfer':
        return group.minCrewForTransfer != null ? String(group.minCrewForTransfer) : '-';
      case 'transferRatio':
        return group.transferRatio != null ? String(group.transferRatio) : '-';
      case 'transferRounding':
        return this.getRoundingLabel(group.transferRounding);
      case 'coxRequiredWeightKg':
        return group.coxRequiredWeightKg != null ? String(group.coxRequiredWeightKg) : '-';
      case 'coxMinWeightKg':
        return group.coxMinWeightKg != null ? String(group.coxMinWeightKg) : '-';
      case 'lightMaxWeightKg':
        return group.lightMaxWeightKg != null ? String(group.lightMaxWeightKg) : '-';
      case 'isActive':
        return group.isActive ? 'Активен' : 'Неактивен';
      case 'createdAt':
        return this.formatDateTime(group.createdAt);
      case 'modifiedAt':
        return this.formatDateTime(group.modifiedAt);
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

  getGenderLabel(gender: CompetitionGroupGender | undefined): string {
    if (!gender) return '-';
    const labels: Record<string, string> = {
      MALE: 'Мъже',
      FEMALE: 'Жени',
      MIXED: 'Смесени',
    };
    return labels[gender] ?? gender;
  }

  getRoundingLabel(rounding: string | undefined): string {
    if (!rounding) return '-';
    const labels: Record<string, string> = {
      FLOOR: 'Надолу',
      CEIL: 'Нагоре',
      ROUND: 'Закръгляне',
    };
    return labels[rounding] ?? rounding;
  }

  getStatusClass(group: CompetitionGroupDefinitionDto): string {
    return group.isActive ? 'text-green-600' : 'text-red-600';
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
