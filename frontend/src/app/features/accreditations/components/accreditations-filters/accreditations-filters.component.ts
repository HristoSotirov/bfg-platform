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
import { AccreditationStatus } from '../../../../core/services/api';
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
import { getRaceGroupOptions } from '../../../../shared/utils/race-group.util';

@Component({
  selector: 'app-accreditations-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectDropdownComponent, SearchBarComponent, FilterToggleButtonComponent],
  templateUrl: './accreditations-filters.component.html',
  styleUrl: './accreditations-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationsFiltersComponent implements OnInit, OnChanges {
  @Input() filters: AccreditationFilters = {
    search: '',
    statuses: [],
    years: [],
    clubs: [],
    raceGroups: [],
  };
  @Input() filterConfigs: FilterConfig[] = [];
  @Input() allClubs: ClubDto[] = [];
  @Input() availableYears: number[] = [];

  @Output() filtersChange = new EventEmitter<AccreditationFilters>();
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';
  filtersExpanded = false;
  selectedYearsCache: string[] = [];

  readonly statusOptions: DropdownOption[] = [
    { value: 'ACTIVE', label: 'Активна' },
    { value: 'PENDING_VALIDATION', label: 'Чакаща валидация' },
    { value: 'PENDING_PHOTO_VALIDATION', label: 'Чакаща снимка' },
    { value: 'NEW_PHOTO_REQUIRED', label: 'Нова снимка' },
    { value: 'EXPIRED', label: 'Изтекла' },
    { value: 'SUSPENDED', label: 'Спряна' },
  ];

  yearOptions: DropdownOption[] = [];
  clubOptions: DropdownOption[] = [];
  readonly raceGroupOptions: DropdownOption[] = getRaceGroupOptions();

  constructor() {}

  ngOnInit(): void {
    try {
      this.searchValue = this.filters.search || '';
      if (!this.filters.statuses) {
        this.filters.statuses = [];
      }
      if (!this.filters.years) {
        this.filters.years = [];
      }
      if (!this.filters.clubs) {
        this.filters.clubs = [];
      }
      if (!this.filters.raceGroups) {
        this.filters.raceGroups = [];
      }
      this.updateSelectedYearsCache();
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
      if (this.filters && !this.filters.statuses) {
        this.filters.statuses = [];
      }
      if (this.filters && !this.filters.years) {
        this.filters.years = [];
      }
      if (this.filters && !this.filters.clubs) {
        this.filters.clubs = [];
      }
      if (this.filters && !this.filters.raceGroups) {
        this.filters.raceGroups = [];
      }
      this.updateSelectedYearsCache();
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
    return config?.visible ?? true;
  }

  hasVisibleFilters(): boolean {
    return (
      this.isFilterVisible('status') ||
      this.isFilterVisible('year') ||
      this.isFilterVisible('club') ||
      this.isFilterVisible('raceGroup')
    );
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  onStatusesChange(values: string[]): void {
    this.emitFiltersChange({ statuses: values as AccreditationStatus[] });
  }

  onYearsChange(values: string[]): void {
    this.selectedYearsCache = values;
    this.emitFiltersChange({ years: values.map((v) => parseInt(v, 10)) });
  }

  onClubsChange(values: string[]): void {
    this.emitFiltersChange({ clubs: values });
  }

  onRaceGroupsChange(values: string[]): void {
    this.emitFiltersChange({ raceGroups: values });
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
