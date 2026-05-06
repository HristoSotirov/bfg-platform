import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ScoringFilters, ScoringFilterConfig } from '../../scoring.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-scoring-filters',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './scoring-filters.component.html',
  styleUrl: './scoring-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringFiltersComponent implements OnInit {
  @Input() filters: ScoringFilters = {
    search: '',
    scoringTypes: [],
    statuses: [],
  };
  @Input() filterConfigs: ScoringFilterConfig[] = [];

  @Output() filtersChange = new EventEmitter<ScoringFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;

  scoringTypeOptions: DropdownOption[] = [
    { value: 'FIXED', label: 'Фиксирано' },
    { value: 'OFFSET_FROM_END', label: 'От края' },
  ];

  statusOptions: DropdownOption[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
    this.statusOptions = [
    { value: 'true', label: this.translate.instant('common.status.active') },
    { value: 'false', label: this.translate.instant('common.status.inactive') },
  ];
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return this.isFilterVisible('scoringType') || this.isFilterVisible('status');
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onScoringTypesChange(values: string[]): void {
    this.emitFiltersChange({ scoringTypes: values });
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values });
  }

  private emitFiltersChange(changes: Partial<ScoringFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
