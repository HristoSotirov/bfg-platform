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
import { DisciplineFilters, DisciplineFilterConfig } from '../../disciplines.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-disciplines-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './disciplines-filters.component.html',
  styleUrl: './disciplines-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplinesFiltersComponent implements OnInit {
  @Input() filters: DisciplineFilters = {
    search: '',
    boatClasses: [],
    statuses: [],
  };
  @Input() filterConfigs: DisciplineFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<DisciplineFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;

  readonly boatClassOptions: DropdownOption[] = [
    { value: '1X', label: '1X' },
    { value: '2X', label: '2X' },
    { value: '2+', label: '2+' },
    { value: '2-', label: '2-' },
    { value: '4X', label: '4X' },
    { value: '4X+', label: '4X+' },
    { value: '4+', label: '4+' },
    { value: '4-', label: '4-' },
    { value: '8+', label: '8+' },
    { value: 'ERGO', label: 'ERGO' },
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
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return this.isFilterVisible('boatClass') || this.isFilterVisible('status');
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onBoatClassesChange(values: string[]): void {
    this.emitFiltersChange({ boatClasses: values });
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  private emitFiltersChange(changes: Partial<DisciplineFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
