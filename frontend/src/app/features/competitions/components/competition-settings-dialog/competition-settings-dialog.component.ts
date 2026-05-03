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
import { CompetitionColumnConfig, CompetitionFilterConfig } from '../../competitions.component';

@Component({
  selector: 'app-competition-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './competition-settings-dialog.component.html',
  styleUrl: './competition-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: CompetitionColumnConfig[] = [];
  @Input() filterConfigs: CompetitionFilterConfig[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{
    columns: CompetitionColumnConfig[];
    filterConfigs: CompetitionFilterConfig[];
  }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: CompetitionColumnConfig[] = [];
  localFilterConfigs: CompetitionFilterConfig[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.localColumns = this.columns.map((c) => ({ ...c }));
      this.localFilterConfigs = this.filterConfigs.map((f) => ({ ...f }));
      this.activeTab = 'columns';
    }
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

  toggleColumn(column: CompetitionColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: CompetitionFilterConfig): void {
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
