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
import { AccreditationStatus, Gender, ScopeType } from '../../../../core/services/api';
import {
  AccreditationFilters,
  FilterConfig,
} from '../../accreditations.component';
import {
  MultiSelectDropdownComponent,
  DropdownOption,
} from '../../../../shared/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { ClubDto } from '../../../../core/services/api';

@Component({
  selector: 'app-accreditations-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
  ],
  templateUrl: './accreditations-filters.component.html',
  styleUrl: './accreditations-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationsFiltersComponent implements OnInit, OnChanges {
  @Input() filters: AccreditationFilters = {
    search: '',
    statuses: [],
    genders: [],
    birthYears: [],
    clubs: [],
    years: [],
    scopeTypes: [],
  };
  @Input() filterConfigs: FilterConfig[] = [];
  @Input() allClubs: ClubDto[] = [];
  @Input() availableYears: number[] = [];
  @Input() availableBirthYears: number[] = [];

  @Output() filtersChange = new EventEmitter<AccreditationFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;
  selectedYearsCache: string[] = [];
  selectedBirthYearsCache: string[] = [];

  readonly statusOptions: DropdownOption[] = [
    { value: AccreditationStatus.Active, label: 'Активна' },
    { value: AccreditationStatus.PendingValidation, label: 'Чакаща валидация' },
    { value: AccreditationStatus.PendingPhotoValidation, label: 'Чакаща снимка' },
    { value: AccreditationStatus.NewPhotoRequired, label: 'Нова снимка' },
    { value: AccreditationStatus.Expired, label: 'Изтекла' },
    { value: AccreditationStatus.Suspended, label: 'Спряна' },
  ];

  readonly genderOptions: DropdownOption[] = [
    { value: Gender.MALE, label: 'Мъж' },
    { value: Gender.FEMALE, label: 'Жена' },
  ];

  yearOptions: DropdownOption[] = [];
  clubOptions: DropdownOption[] = [];
  readonly scopeTypeOptions: DropdownOption[] = [
    { value: ScopeType.Internal, label: 'Вътрешен' },
    { value: ScopeType.External, label: 'Външен' },
    { value: ScopeType.National, label: 'Национален' },
  ];

  get birthYearOptions(): DropdownOption[] {
    return this.availableBirthYears.map((y) => ({ value: String(y), label: String(y) }));
  }

  ngOnInit(): void {
    try {
      this.searchValue = this.filters.search || '';
      if (!this.filters.statuses) this.filters.statuses = [];
      if (!this.filters.genders) this.filters.genders = [];
      if (!this.filters.years) this.filters.years = [];
      if (!this.filters.clubs) this.filters.clubs = [];
      if (!this.filters.birthYears) this.filters.birthYears = [];
      if (!this.filters.scopeTypes) this.filters.scopeTypes = [];
      this.updateSelectedYearsCache();
      this.updateSelectedBirthYearsCache();
      this.updateClubOptions();
      this.updateYearOptions();
    } catch (error) {
      console.error(
        '[AccreditationsFiltersComponent] Error in ngOnInit:',
        error,
      );
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      if (this.filters && !this.filters.statuses) this.filters.statuses = [];
      if (this.filters && !this.filters.genders) this.filters.genders = [];
      if (this.filters && !this.filters.years) this.filters.years = [];
      if (this.filters && !this.filters.clubs) this.filters.clubs = [];
      if (this.filters && !this.filters.birthYears) this.filters.birthYears = [];
      if (this.filters && !this.filters.scopeTypes) this.filters.scopeTypes = [];
      this.updateSelectedYearsCache();
      this.updateSelectedBirthYearsCache();
    }

    if (changes['allClubs']) {
      this.updateClubOptions();
    }

    if (changes['availableYears']) {
      this.updateYearOptions();
      this.updateSelectedYearsCache();
    }
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return (
      this.isFilterVisible('status') ||
      this.isFilterVisible('gender') ||
      this.isFilterVisible('birthYear') ||
      this.isFilterVisible('year') ||
      this.isFilterVisible('club') ||
      this.isFilterVisible('scopeType')
    );
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values as AccreditationStatus[] });
  }

  onGendersChange(values: string[]): void {
    this.emitFiltersChange({ genders: values });
  }

  onBirthYearsChange(values: string[]): void {
    this.selectedBirthYearsCache = values;
    this.emitFiltersChange({ birthYears: values.map((v) => parseInt(v, 10)) });
  }

  onClubsChange(values: string[]): void {
    this.emitFiltersChange({ clubs: values });
  }

  onYearsChange(values: string[]): void {
    this.selectedYearsCache = values;
    this.emitFiltersChange({ years: values.map((v) => parseInt(v, 10)) });
  }

  onScopeTypesChange(values: string[]): void {
    this.emitFiltersChange({ scopeTypes: values });
  }

  private emitFiltersChange(changes: Partial<AccreditationFilters>): void {
    this.filtersChange.emit({
      ...this.filters,
      ...changes,
    });
  }

  private updateSelectedYearsCache(): void {
    this.selectedYearsCache = (this.filters.years || []).map((y) => String(y));
  }

  private updateSelectedBirthYearsCache(): void {
    this.selectedBirthYearsCache = (this.filters.birthYears || []).map((y) => String(y));
  }

  private updateClubOptions(): void {
    this.clubOptions = (this.allClubs || []).map((club) => ({
      value: club.uuid || '',
      label: club.shortName || club.name || '',
    }));
  }

  private updateYearOptions(): void {
    this.yearOptions = (this.availableYears || []).map((year) => ({
      value: String(year),
      label: String(year),
    }));
  }
}
