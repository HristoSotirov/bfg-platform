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
import { AccreditationStatus, Gender } from '../../../../core/services/api';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-accreditations-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectDropdownComponent,
    SearchBarComponent,
    FilterToggleButtonComponent,
    TranslateModule,
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

  statusOptions: DropdownOption[] = [
    { value: AccreditationStatus.Active, label: this.translateService.instant('accreditations.status.active') },
    { value: AccreditationStatus.PendingValidation, label: this.translateService.instant('accreditations.status.pendingValidation') },
    { value: AccreditationStatus.PendingPhotoValidation, label: this.translateService.instant('accreditations.status.pendingPhoto') },
    { value: AccreditationStatus.NewPhotoRequired, label: this.translateService.instant('accreditations.status.newPhoto') },
    { value: AccreditationStatus.Expired, label: this.translateService.instant('accreditations.status.expired') },
    { value: AccreditationStatus.Suspended, label: this.translateService.instant('accreditations.status.suspended') },
  ];

  genderOptions: DropdownOption[] = [
    { value: Gender.MALE, label: this.translateService.instant('accreditations.gender.male') },
    { value: Gender.FEMALE, label: this.translateService.instant('accreditations.gender.female') },
  ];

  yearOptions: DropdownOption[] = [];

  constructor(private translateService: TranslateService) {}
  clubOptions: DropdownOption[] = [];

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
      this.isFilterVisible('club')
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
