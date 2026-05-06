import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompetitionDto } from '../../../../core/services/api';
import { CompetitionColumnConfig } from '../../competitions.component';
import { computeCompetitionStatus, STATUS_LABELS, STATUS_CLASSES, ComputedCompetitionStatus } from '../../utils/competition-status.util';

@Component({
  selector: 'app-competitions-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './competitions-table.component.html',
  styleUrl: './competitions-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionsTableComponent implements OnInit {
  private translate = inject(TranslateService);

  @Input() competitions: CompetitionDto[] = [];
  @Input() columns: CompetitionColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<CompetitionDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;
    const parts = this.orderBy[0].split('_');
    if (parts.length === 2) {
      this.currentSort = { column: parts[0], direction: parts[1] as 'asc' | 'desc' };
    }
  }

  get visibleColumns(): CompetitionColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onRowClick(competition: CompetitionDto): void {
    this.rowClick.emit(competition);
  }

  onSort(columnId: string): void {
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      shortName: 'shortName',
      startDate: 'startDate',
      createdAt: 'createdAt',
      modifiedAt: 'modifiedAt',
    };
    if (!sortFieldMap[columnId]) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };
    this.sortChange.emit([`${sortFieldMap[columnId]}_${direction}`]);
  }

  getCellValue(c: CompetitionDto, columnId: string): string {
    switch (columnId) {
      case 'shortName': return c.shortName || '-';
      case 'name': return c.name || '-';
      case 'status': return this.getStatusLabel(computeCompetitionStatus(c));
      case 'startDate': return c.startDate ? this.formatDate(c.startDate) : '-';
      case 'endDate': return c.endDate ? this.formatDate(c.endDate) : '-';
      case 'location': return c.location || '-';
      case 'createdAt': return this.formatDate(c.createdAt);
      case 'modifiedAt': return this.formatDate(c.modifiedAt);
      default: return '-';
    }
  }

  getStatusLabel(status: string | null | undefined): string {
    const key = status ? (STATUS_LABELS[status as ComputedCompetitionStatus] ?? null) : null;
    return key ? this.translate.instant(key) : '-';
  }

  getStatusClass(c: CompetitionDto): string {
    const s = computeCompetitionStatus(c);
    return s ? (STATUS_CLASSES[s] || 'text-gray-900') : 'text-gray-900';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      if (this.hasMore && !this.loading) {
        this.loadMore.emit();
      }
    }
  }
}
