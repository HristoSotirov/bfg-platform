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
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  ScoringColumnConfig,
  ScoringFilterConfig,
} from '../../scoring.component';

@Component({
  selector: 'app-scoring-settings-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './scoring-settings-dialog.component.html',
  styleUrl: './scoring-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: ScoringColumnConfig[] = [];
  @Input() filterConfigs: ScoringFilterConfig[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{
    columns: ScoringColumnConfig[];
    filterConfigs: ScoringFilterConfig[];
  }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: ScoringColumnConfig[] = [];
  localFilterConfigs: ScoringFilterConfig[] = [];

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

  toggleColumn(column: ScoringColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: ScoringFilterConfig): void {
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
