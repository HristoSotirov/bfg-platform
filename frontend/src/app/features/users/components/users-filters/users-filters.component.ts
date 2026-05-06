import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserFilters, UserFilterConfig } from '../../users.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { SystemRole } from '../../../../core/services/api';

@Component({
  selector: 'app-users-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './users-filters.component.html',
  styleUrl: './users-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersFiltersComponent implements OnInit, OnDestroy {
  @Input() filters: UserFilters = {
    search: '',
    roles: [],
    statuses: [],
  };
  @Input() filterConfigs: UserFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<UserFilters>();
  @Output() searchChange = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  searchValue = '';
  filtersExpanded = false; // Start collapsed on mobile

  roleOptions: DropdownOption[] = [];
  statusOptions: DropdownOption[] = [];

  constructor(private translateService: TranslateService) {}

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
    this.initOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.initOptions();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initOptions(): void {
    this.roleOptions = [
      { value: SystemRole.AppAdmin, label: this.translateService.instant('common.roles.APP_ADMIN') },
      { value: SystemRole.FederationAdmin, label: this.translateService.instant('common.roles.FEDERATION_ADMIN') },
      { value: SystemRole.ClubAdmin, label: this.translateService.instant('common.roles.CLUB_ADMIN') },
      { value: SystemRole.Coach, label: this.translateService.instant('common.roles.COACH') },
      { value: SystemRole.Umpire, label: this.translateService.instant('common.roles.UMPIRE') },
    ];
    this.statusOptions = [
      { value: 'true', label: this.translateService.instant('common.status.active') },
      { value: 'false', label: this.translateService.instant('common.status.inactive') },
    ];
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    // If config doesn't exist, the filter is not available for this user
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return (
      this.isFilterVisible('role') ||
      this.isFilterVisible('status')
    );
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onRolesChange(values: string[]): void {
    this.emitFiltersChange({ roles: values });
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  private emitFiltersChange(changes: Partial<UserFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
