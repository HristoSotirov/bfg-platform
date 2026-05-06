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
  QualificationColumnConfig,
  QualificationFilterConfig,
} from '../../qualification.component';

@Component({
  selector: 'app-qualification-settings-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent],
  templateUrl: './qualification-settings-dialog.component.html',
  styleUrl: './qualification-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: QualificationColumnConfig[] = [];
  @Input() filterConfigs: QualificationFilterConfig[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{
    columns: QualificationColumnConfig[];
    filterConfigs: QualificationFilterConfig[];
  }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: QualificationColumnConfig[] = [];
  localFilterConfigs: QualificationFilterConfig[] = [];

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

  toggleColumn(column: QualificationColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: QualificationFilterConfig): void {
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
