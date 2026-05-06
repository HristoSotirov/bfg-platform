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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClubFilters, ClubFilterConfig } from '../../clubs.component';
import { ScopeType } from '../../../../core/services/api';
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
    TranslateModule,
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

  statusOptions: DropdownOption[] = [];
  scopeTypeOptions: DropdownOption[] = [];

  constructor(private translateService: TranslateService) {}

  ngOnInit(): void {
    this.searchValue = this.filters.search || '';
    this.initOptions();
    this.translateService.onLangChange.subscribe(() => this.initOptions());
  }

  private initOptions(): void {
    this.statusOptions = [
      { value: 'true', label: this.translateService.instant('common.active') },
      { value: 'false', label: this.translateService.instant('common.inactive') },
    ];
    this.scopeTypeOptions = [
      { value: ScopeType.Internal, label: this.translateService.instant('clubs.scopeTypes.internal') },
      { value: ScopeType.External, label: this.translateService.instant('clubs.scopeTypes.external') },
      { value: ScopeType.National, label: this.translateService.instant('clubs.scopeTypes.national') },
    ];
  }

  isFilterVisible(filterId: string): boolean {
    const config = this.filterConfigs.find((f) => f.id === filterId);
    // If config doesn't exist, the filter is not available for this user
    if (!config) return false;
    return config.visible;
  }

  hasVisibleFilters(): boolean {
    return this.isFilterVisible('status') || this.isFilterVisible('type');
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
