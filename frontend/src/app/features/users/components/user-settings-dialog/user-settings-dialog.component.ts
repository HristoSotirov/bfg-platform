import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { UserColumnConfig, UserFilterConfig } from '../../users.component';

@Component({
  selector: 'app-user-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './user-settings-dialog.component.html',
  styleUrl: './user-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: UserColumnConfig[] = [];
  @Input() filterConfigs: UserFilterConfig[] = [];
  /** When false, scope type column and filter are hidden from settings (non-APP_ADMIN/FED_ADMIN) */
  @Input() showScopeFeatures = false;

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{
    columns: UserColumnConfig[];
    filterConfigs: UserFilterConfig[];
  }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: UserColumnConfig[] = [];
  localFilterConfigs: UserFilterConfig[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.localColumns = this.columns.map((c) => ({ ...c }));
      this.localFilterConfigs = this.filterConfigs.map((f) => ({ ...f }));
      this.activeTab = 'columns';
    }
  }

  get visibleColumns(): UserColumnConfig[] {
    return this.showScopeFeatures
      ? this.localColumns
      : this.localColumns.filter((c) => c.id !== 'scopeType');
  }

  get visibleFilterConfigs(): UserFilterConfig[] {
    return this.showScopeFeatures
      ? this.localFilterConfigs
      : this.localFilterConfigs.filter((f) => f.id !== 'scopeType');
  }

  close(): void {
    this.closed.emit();
  }

  save(): void {
    this.settingsChange.emit({
      columns: this.localColumns,
      filterConfigs: this.localFilterConfigs,
    });
    this.close();
  }

  toggleColumn(column: UserColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: UserFilterConfig): void {
    filter.visible = !filter.visible;
  }

  selectAllColumns(): void {
    this.localColumns.forEach((c) => (c.visible = true));
  }

  deselectAllColumns(): void {
    this.localColumns.forEach((c) => (c.visible = false));
  }

  selectAllFilters(): void {
    this.localFilterConfigs.forEach((f) => (f.visible = true));
  }

  deselectAllFilters(): void {
    this.localFilterConfigs.forEach((f) => (f.visible = false));
  }
}
