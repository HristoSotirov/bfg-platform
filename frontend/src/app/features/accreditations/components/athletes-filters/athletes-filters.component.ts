import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AthleteFilters, AthleteFilterConfig } from '../../accreditations.component';
import { Gender } from '../../../../core/services/api';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';

@Component({
  selector: 'app-athletes-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './athletes-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthletesFiltersComponent implements OnInit, OnChanges {
  @Input() filters: AthleteFilters = {
    search: '',
    genders: [],
    birthYears: [],
  };
  @Input() filterConfigs: AthleteFilterConfig[] = [];
  @Input() availableBirthYears: number[] = [];

  @Output() filtersChange = new EventEmitter<AthleteFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;
  selectedBirthYearsCache: string[] = [];

  readonly genderOptions: DropdownOption[] = [
    { value: Gender.MALE, label: 'Мъж' },
    { value: Gender.FEMALE, label: 'Жена' },
  ];

  get birthYearOptions(): DropdownOption[] {
    return this.availableBirthYears.map((y) => ({ value: String(y), label: String(y) }));
  }

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
    this.updateBirthYearsCache();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.searchValue = this.filters.search || '';
      this.updateBirthYearsCache();
    }
  }

  private updateBirthYearsCache(): void {
    this.selectedBirthYearsCache = (this.filters.birthYears || []).map((y) => String(y));
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return (
      this.isFilterVisible('gender') ||
      this.isFilterVisible('birthYear')
    );
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onGendersChange(values: string[]): void {
    this.emitFiltersChange({ genders: values });
  }

  onBirthYearsChange(values: string[]): void {
    this.selectedBirthYearsCache = values;
    this.emitFiltersChange({ birthYears: values.map((v) => parseInt(v, 10)) });
  }

  private emitFiltersChange(changes: Partial<AthleteFilters>): void {
    this.filtersChange.emit({ ...this.filters, ...changes });
  }
}
