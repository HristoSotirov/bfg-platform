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
    TranslateModule,
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
    competitionGroupIds: [],
  };
  @Input() filterConfigs: DisciplineFilterConfig[] = [];
  @Input() groupOptions: DropdownOption[] = [];

  @Output() filtersChange = new EventEmitter<DisciplineFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;

  readonly boatClassOptions: DropdownOption[] = [
    { value: 'SINGLE_SCULL', label: '1X' },
    { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' },
    { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' },
    { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' },
    { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' },
    { value: 'ERGO', label: 'ERGO' },
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
    return this.isFilterVisible('competitionGroup') || this.isFilterVisible('boatClass') || this.isFilterVisible('status');
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

  onGroupsChange(values: string[]): void {
    this.emitFiltersChange({ competitionGroupIds: values });
  }

  private emitFiltersChange(changes: Partial<DisciplineFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }
}
