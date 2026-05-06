import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AccreditationDto,
  AccreditationStatus,
  Gender,
} from '../../../../core/services/api';
import { ColumnConfig } from '../../accreditations.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { calculateRaceGroup } from '../../../../shared/utils/race-group.util';

@Component({
  selector: 'app-accreditations-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './accreditations-table.component.html',
  styleUrl: './accreditations-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationsTableComponent implements OnInit {
  @Input() accreditations: AccreditationDto[] = [];
  @Input() columns: ColumnConfig[] = [];
  @Input() selectedIds: Set<string> = new Set();
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() canSelect = false;
  @Input() orderBy: string[] = [];

  @Output() rowClick = new EventEmitter<AccreditationDto>();
  @Output() selectionChange = new EventEmitter<Set<string>>();
  @Output() selectAllRequested = new EventEmitter<void>();
  @Output() sortChange = new EventEmitter<string[]>();
  @Output() loadMore = new EventEmitter<void>();

  @Input() selectingAll = false;
  @Input() maxSelection: number | null = null;

  currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  private statusLabels: Record<string, string> = {
    [AccreditationStatus.Active]: 'accreditations.status.active',
    [AccreditationStatus.PendingValidation]: 'accreditations.status.pendingValidation',
    [AccreditationStatus.PendingPhotoValidation]: 'accreditations.status.pendingPhoto',
    [AccreditationStatus.NewPhotoRequired]: 'accreditations.status.newPhoto',
    [AccreditationStatus.Expired]: 'accreditations.status.expired',
    [AccreditationStatus.Suspended]: 'accreditations.status.suspended',
  };

  constructor(private elementRef: ElementRef, private translateService: TranslateService) {}

  ngOnInit(): void {
    this.updateCurrentSortFromOrderBy();
  }

  private updateCurrentSortFromOrderBy(): void {
    if (this.orderBy.length === 0) return;

    const sortFieldMap: Record<string, string> = {
      'athlete.firstName': 'firstName',
      'athlete.middleName': 'middleName',
      'athlete.lastName': 'lastName',
      'athlete.gender': 'gender',
      'athlete.dateOfBirth': 'dateOfBirth',
      'club.name': 'clubShortName',
      accreditationNumber: 'accreditationNumber',
      year: 'year',
      status: 'status',
      'athlete.insuranceTo': 'insurance',
      'athlete.medicalExaminationDue': 'medicalExamDue',
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

  get visibleColumns(): ColumnConfig[] {
    return this.columns.filter((c) => c.visible);
  }

  get allSelected(): boolean {
    return (
      this.accreditations.length > 0 &&
      this.accreditations.every((a) => a.uuid && this.selectedIds.has(a.uuid))
    );
  }

  isSelected(accreditation: AccreditationDto): boolean {
    return !!accreditation.uuid && this.selectedIds.has(accreditation.uuid);
  }

  toggleSelectAll(): void {
    if (this.selectingAll) return;
    if (this.allSelected) {
      this.selectionChange.emit(new Set<string>());
    } else {
      this.selectAllRequested.emit();
    }
  }

  toggleSelect(accreditation: AccreditationDto, event: Event): void {
    event.stopPropagation();
    const newSelection = new Set(this.selectedIds);
    if (accreditation.uuid) {
      if (newSelection.has(accreditation.uuid)) {
        newSelection.delete(accreditation.uuid);
      } else if (
        this.maxSelection == null ||
        newSelection.size < this.maxSelection
      ) {
        newSelection.add(accreditation.uuid);
      }
    }
    if (
      newSelection.size !== this.selectedIds.size ||
      [...newSelection].some((id) => !this.selectedIds.has(id))
    ) {
      this.selectionChange.emit(newSelection);
    }
  }

  onRowClick(accreditation: AccreditationDto): void {
    this.rowClick.emit(accreditation);
  }

  onSort(columnId: string): void {
    let direction: 'asc' | 'desc' = 'asc';
    if (this.currentSort?.column === columnId) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { column: columnId, direction };

    const sortFieldMap: Record<string, string> = {
      firstName: 'athlete.firstName',
      middleName: 'athlete.middleName',
      lastName: 'athlete.lastName',
      gender: 'athlete.gender',
      dateOfBirth: 'athlete.dateOfBirth',
      raceGroup: 'athlete.dateOfBirth', // kept for compatibility but column removed
      clubShortName: 'club.name',
      clubName: 'club.name',
      accreditationNumber: 'accreditationNumber',
      year: 'year',
      status: 'status',
      insurance: 'athlete.insuranceTo',
      medicalExamDue: 'athlete.medicalExaminationDue',
      createdAt: 'createdAt',
      updatedAt: 'modifiedAt',
    };

    const sortField = sortFieldMap[columnId];
    if (sortField) {
      this.sortChange.emit([`${sortField}_${direction}`]);
    }
  }

  getCellValue(accreditation: AccreditationDto, columnId: string): string {
    switch (columnId) {
      case 'firstName':
        return accreditation.athlete?.firstName || '-';
      case 'middleName':
        return accreditation.athlete?.middleName || '-';
      case 'lastName':
        return accreditation.athlete?.lastName || '-';
      case 'dateOfBirth':
        return this.formatDate(accreditation.athlete?.dateOfBirth);
      case 'raceGroup':
        return this.getRaceGroup(accreditation);
      case 'gender':
        return this.getGenderLabel(accreditation.athlete?.gender);
      case 'clubShortName':
        return accreditation.club?.shortName || '-';
      case 'clubName':
        return accreditation.club?.name || '-';
      case 'clubEmail':
        return accreditation.club?.clubEmail || '-';
      case 'clubAdminName':
        return accreditation.club?.clubAdminUser
          ? `${accreditation.club.clubAdminUser.firstName || ''} ${accreditation.club.clubAdminUser.lastName || ''}`.trim() ||
              '-'
          : '-';
      case 'accreditationNumber':
        return accreditation.accreditationNumber || '-';
      case 'year':
        return accreditation.year?.toString() || '-';
      case 'status':
        return this.getStatusLabel(accreditation.status);
      case 'insurance':
        return this.getInsurancePeriod(accreditation);
      case 'medicalExamDue':
        return this.formatDate(accreditation.athlete?.medicalExaminationDue);
      case 'createdAt':
        return this.formatDateTime(accreditation.createdAt);
      case 'updatedAt':
        return this.formatDateTime(accreditation.updatedAt);
      default:
        return '-';
    }
  }

  private getGenderLabel(gender: string | undefined): string {
    if (!gender) return '-';
    const genderKeys: Record<string, string> = {
      MALE: 'accreditations.gender.male',
      FEMALE: 'accreditations.gender.female',
    };
    const key = genderKeys[gender.toUpperCase()];
    return key ? this.translateService.instant(key) : gender;
  }

  getRaceGroup(accreditation: AccreditationDto): string {
    const raceGroup = calculateRaceGroup(
      accreditation.athlete?.dateOfBirth,
      accreditation.athlete?.gender,
    );
    return raceGroup.label;
  }

  getInsurancePeriod(accreditation: AccreditationDto): string {
    const from = this.formatDate(accreditation.athlete?.insuranceFrom);
    const to = this.formatDate(accreditation.athlete?.insuranceTo);
    if (from === '-' && to === '-') return '-';
    return `${from} - ${to}`;
  }

  isInsuranceValid(accreditation: AccreditationDto): boolean {
    const from = accreditation.athlete?.insuranceFrom;
    const to = accreditation.athlete?.insuranceTo;
    if (!from || !to) return false;

    const now = new Date();
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return now >= fromDate && now <= toDate;
  }

  isMedicalExamValid(accreditation: AccreditationDto): boolean {
    const due = accreditation.athlete?.medicalExaminationDue;
    if (!due) return false;
    return new Date(due) >= new Date();
  }

  getCellClass(accreditation: AccreditationDto, columnId: string): string {
    switch (columnId) {
      case 'status':
        return this.getStatusClass(accreditation.status);
      case 'insurance':
        return this.isInsuranceValid(accreditation)
          ? 'text-green-600'
          : 'text-red-600';
      case 'medicalExamDue':
        return this.isMedicalExamValid(accreditation)
          ? 'text-green-600'
          : 'text-red-600';
      default:
        return 'text-gray-900';
    }
  }

  getStatusLabel(status: AccreditationStatus | undefined): string {
    if (!status) return '-';
    const key = this.statusLabels[status];
    return key ? this.translateService.instant(key) : status;
  }

  getStatusClass(status: AccreditationStatus | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'EXPIRED':
        return 'text-gray-500';
      case 'PENDING_VALIDATION':
      case 'PENDING_PHOTO_VALIDATION':
        return 'text-yellow-600';
      case 'NEW_PHOTO_REQUIRED':
        return 'text-orange-500';
      case 'SUSPENDED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (!element) return;

    const threshold = 100;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < threshold && this.hasMore && !this.loading) {
      this.loadMore.emit();
    }
  }
}
