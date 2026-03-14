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
import { ClubFilters, ClubFilterConfig } from '../../clubs.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-clubs-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './clubs-filters.component.html',
  styleUrl: './clubs-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubsFiltersComponent implements OnInit {
  @Input() filters: ClubFilters = {
    search: '',
    statuses: [],
    scopeTypes: [],
  };
  @Input() filterConfigs: ClubFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<ClubFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false; // Start collapsed on mobile

  readonly statusOptions: DropdownOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  readonly scopeTypeOptions: DropdownOption[] = [
    { value: 'INTERNAL', label: 'Вътрешен' },
    { value: 'EXTERNAL', label: 'Външен' },
    { value: 'NATIONAL', label: 'Национален' },
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
    return this.isFilterVisible('status') || this.isFilterVisible('scopeType');
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  onScopeTypesChange(values: string[]): void {
    this.emitFiltersChange({ scopeTypes: values });
  }

  private emitFiltersChange(changes: Partial<ClubFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
