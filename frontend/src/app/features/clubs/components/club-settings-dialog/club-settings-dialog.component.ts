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
import { ClubColumnConfig, ClubFilterConfig } from '../../clubs.component';

@Component({
  selector: 'app-club-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './club-settings-dialog.component.html',
  styleUrl: './club-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: ClubColumnConfig[] = [];
  @Input() filterConfigs: ClubFilterConfig[] = [];
  @Input() showScopeFeatures = false;

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{
    columns: ClubColumnConfig[];
    filterConfigs: ClubFilterConfig[];
  }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: ClubColumnConfig[] = [];
  localFilterConfigs: ClubFilterConfig[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.localColumns = this.columns.map((c) => ({ ...c }));
      this.localFilterConfigs = this.filterConfigs.map((f) => ({ ...f }));
      this.activeTab = 'columns';
    }
  }

  get visibleColumns(): ClubColumnConfig[] {
    return this.showScopeFeatures
      ? this.localColumns
      : this.localColumns.filter((c) => c.id !== 'type');
  }

  get visibleFilterConfigs(): ClubFilterConfig[] {
    return this.showScopeFeatures
      ? this.localFilterConfigs
      : this.localFilterConfigs.filter((f) => f.id !== 'type');
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

  toggleColumn(column: ClubColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: ClubFilterConfig): void {
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
