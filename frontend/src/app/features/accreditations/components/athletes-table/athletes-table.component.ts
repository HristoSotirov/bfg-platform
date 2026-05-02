import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AthleteDto, Gender, ScopeType } from '../../../../core/services/api';
import { ColumnConfig } from '../../accreditations.component';

@Component({
  selector: 'app-athletes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './athletes-table.component.html',
  styleUrl: './athletes-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthletesTableComponent implements OnInit {
  @Input() athletes: AthleteDto[] = [];
  @Input() columns: ColumnConfig[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<AthleteDto>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;
    const sortFieldMap: Record<string, string> = {
      lastName: 'lastName',
      firstName: 'firstName',
      middleName: 'middleName',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      scopeType: 'scopeType',
      medicalExaminationDue: 'medicalExaminationDue',
      insurance: 'insuranceTo',
      registeredOn: 'registeredOn',
      modifiedAt: 'modifiedAt',
    };
    const firstSort = this.orderBy[0];
    const lastUnderscore = firstSort.lastIndexOf('_');
    if (lastUnderscore < 0) return;
    const field = firstSort.substring(0, lastUnderscore);
    const direction = firstSort.substring(lastUnderscore + 1) as 'asc' | 'desc';
    const columnId = sortFieldMap[field];
    if (columnId) {
      this.currentSort = { column: columnId, direction };
    }
  }

  get visibleColumns(): ColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  onSort(columnId: string): void {
    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };

    const sortFieldMap: Record<string, string> = {
      lastName: 'lastName',
      firstName: 'firstName',
      middleName: 'middleName',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      scopeType: 'scopeType',
      medicalExaminationDue: 'medicalExaminationDue',
      insurance: 'insuranceTo',
      registeredOn: 'registeredOn',
      modifiedAt: 'modifiedAt',
    };
    const sortField = sortFieldMap[columnId];
    if (sortField) {
      this.sortChange.emit([`${sortField}_${direction}`]);
    }
  }

  getCellValue(athlete: AthleteDto, columnId: string): string {
    switch (columnId) {
      case 'lastName':
        return athlete.lastName || '-';
      case 'firstName':
        return athlete.firstName || '-';
      case 'middleName':
        return athlete.middleName || '-';
      case 'dateOfBirth':
        return this.formatDate(athlete.dateOfBirth);
      case 'gender':
        return athlete.gender === Gender.MALE ? 'Мъж' : athlete.gender === Gender.FEMALE ? 'Жена' : '-';
      case 'scopeType':
        return this.getScopeLabel(athlete.scopeType);
      case 'medicalExaminationDue':
        return this.formatDate(athlete.medicalExaminationDue);
      case 'insurance':
        return this.getInsurancePeriod(athlete);
      case 'registeredOn':
        return this.formatDate(athlete.registeredOn);
      case 'modifiedAt':
        return this.formatDate(athlete.modifiedAt);
      default:
        return '-';
    }
  }

  getCellClass(athlete: AthleteDto, columnId: string): string {
    switch (columnId) {
      case 'medicalExaminationDue':
        return this.isDateValid(athlete.medicalExaminationDue) ? 'text-green-600' : 'text-red-600';
      case 'insurance':
        return this.isInsuranceValid(athlete) ? 'text-green-600' : 'text-red-600';
      default:
        return 'text-gray-900';
    }
  }

  private isDateValid(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
  }

  private isInsuranceValid(athlete: AthleteDto): boolean {
    if (!athlete.insuranceFrom || !athlete.insuranceTo) return false;
    const now = new Date();
    return now >= new Date(athlete.insuranceFrom) && now <= new Date(athlete.insuranceTo);
  }

  private getScopeLabel(scope: string | undefined): string {
    if (!scope) return '-';
    const map: Record<string, string> = { [ScopeType.Internal]: 'Вътрешен', [ScopeType.External]: 'Външен', [ScopeType.National]: 'Национален' };
    return map[scope] ?? scope;
  }

  private getInsurancePeriod(athlete: AthleteDto): string {
    const from = this.formatDate(athlete.insuranceFrom);
    const to = this.formatDate(athlete.insuranceTo);
    if (from === '-' && to === '-') return '-';
    return `${from} - ${to}`;
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
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && this.hasMore && !this.loading) {
      this.loadMore.emit();
    }
  }
}
