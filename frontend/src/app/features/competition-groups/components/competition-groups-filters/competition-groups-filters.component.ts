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
import { CompetitionGroupFilters, FilterConfig } from '../../competition-groups.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-competition-groups-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './competition-groups-filters.component.html',
  styleUrl: './competition-groups-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionGroupsFiltersComponent implements OnInit {
  @Input() filters: CompetitionGroupFilters = {
    search: '',
    statuses: [],
  };
  @Input() filterConfigs: FilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<CompetitionGroupFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;

  readonly statusOptions: DropdownOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return this.isFilterVisible('status');
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  private emitFiltersChange(changes: Partial<CompetitionGroupFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
