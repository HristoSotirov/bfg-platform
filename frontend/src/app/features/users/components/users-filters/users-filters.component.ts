import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './users-filters.component.html',
  styleUrl: './users-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersFiltersComponent implements OnInit {
  @Input() filters: UserFilters = {
    search: '',
    roles: [],
    statuses: [],
  };
  @Input() filterConfigs: UserFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<UserFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false; // Start collapsed on mobile

  readonly roleOptions: DropdownOption[] = [
    { value: SystemRole.AppAdmin, label: 'Администратор' },
    { value: SystemRole.FederationAdmin, label: 'Администратор на федерацията' },
    { value: SystemRole.ClubAdmin, label: 'Администратор на клуб' },
    { value: SystemRole.Coach, label: 'Треньор' },
    { value: SystemRole.Umpire, label: 'Съдия' },
  ];

  readonly statusOptions: DropdownOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
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
