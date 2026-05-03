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
import { CompetitionFilters, CompetitionFilterConfig } from '../../competitions.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-competitions-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './competitions-filters.component.html',
  styleUrl: './competitions-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionsFiltersComponent implements OnInit {
  @Input() filters: CompetitionFilters = {
    search: '',
    statuses: [],
  };
  @Input() filterConfigs: CompetitionFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<CompetitionFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;

  readonly statusOptions: DropdownOption[] = [];

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    return config?.visible ?? false;
  }

  hasVisibleFilters(): boolean {
    return false;
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  private emitFiltersChange(changes: Partial<CompetitionFilters>): void {
    this.filtersChange.emit({ ...this.filters, ...changes });
  }
}
