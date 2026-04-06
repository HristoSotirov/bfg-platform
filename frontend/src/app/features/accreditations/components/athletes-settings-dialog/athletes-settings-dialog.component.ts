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
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ColumnConfig, AthleteFilterConfig } from '../../accreditations.component';

@Component({
  selector: 'app-athletes-settings-dialog',
  standalone: true,
  imports: [CommonModule, DialogComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog
      [isOpen]="isOpen"
      title="Настройки на таблицата"
      size="md"
      (closed)="close()"
    >
      <div class="space-y-4">
        <div class="flex border-b border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition-colors"
            [class.text-bfg-blue]="activeTab === 'columns'"
            [class.border-b-2]="activeTab === 'columns'"
            [class.border-bfg-blue]="activeTab === 'columns'"
            [class.text-gray-500]="activeTab !== 'columns'"
            (click)="activeTab = 'columns'"
          >
            Колони
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition-colors"
            [class.text-bfg-blue]="activeTab === 'filters'"
            [class.border-b-2]="activeTab === 'filters'"
            [class.border-bfg-blue]="activeTab === 'filters'"
            [class.text-gray-500]="activeTab !== 'filters'"
            (click)="activeTab = 'filters'"
          >
            Филтри
          </button>
        </div>

        <div class="min-h-[320px]">
          @if (activeTab === 'columns') {
            <div class="space-y-3">
              <p class="text-sm text-gray-600">Изберете кои колони да се показват в таблицата.</p>
              <div class="flex gap-2 mb-2">
                <button type="button" class="text-xs text-bfg-blue hover:underline" (click)="selectAllColumns()">Избери всички</button>
                <span class="text-gray-300">|</span>
                <button type="button" class="text-xs text-bfg-blue hover:underline" (click)="deselectAllColumns()">Премахни всички</button>
              </div>
              <div class="space-y-2 max-h-60 overflow-y-auto scrollbar-hover">
                @for (column of localColumns; track column.id) {
                  <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="column.visible"
                      (change)="toggleColumn(column)"
                      class="h-4 w-4 text-bfg-blue border-gray-300 rounded focus:ring-bfg-blue"
                    />
                    <span class="text-sm text-gray-700">{{ column.label }}</span>
                  </label>
                }
              </div>
            </div>
          }

          @if (activeTab === 'filters') {
            <div class="space-y-3">
              <p class="text-sm text-gray-600">Изберете кои филтри да се показват. При скриване на филтър стойността му се изчиства.</p>
              <div class="flex gap-2 mb-2">
                <button type="button" class="text-xs text-bfg-blue hover:underline" (click)="selectAllFilters()">Избери всички</button>
                <span class="text-gray-300">|</span>
                <button type="button" class="text-xs text-bfg-blue hover:underline" (click)="deselectAllFilters()">Премахни всички</button>
              </div>
              <div class="space-y-2 max-h-60 overflow-y-auto scrollbar-hover">
                @for (filter of localFilterConfigs; track filter.id) {
                  <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="filter.visible"
                      (change)="toggleFilter(filter)"
                      class="h-4 w-4 text-bfg-blue border-gray-300 rounded focus:ring-bfg-blue"
                    />
                    <span class="text-sm text-gray-700">{{ filter.label }}</span>
                  </label>
                }
              </div>
            </div>
          }
        </div>

        <div class="flex justify-center gap-3 pt-4 border-t">
          <app-button variant="outline" size="md" text="Отказ" (click)="close()"></app-button>
          <app-button variant="primary" size="md" text="Запази" (click)="save()"></app-button>
        </div>
      </div>
    </app-dialog>
  `,
})
export class AthletesSettingsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() columns: ColumnConfig[] = [];
  @Input() filterConfigs: AthleteFilterConfig[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<{ columns: ColumnConfig[]; filterConfigs: AthleteFilterConfig[] }>();

  activeTab: 'columns' | 'filters' = 'columns';
  localColumns: ColumnConfig[] = [];
  localFilterConfigs: AthleteFilterConfig[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.localColumns = this.columns.map((c) => ({ ...c }));
      this.localFilterConfigs = this.filterConfigs.map((f) => ({ ...f }));
      this.activeTab = 'columns';
    }
  }

  toggleColumn(column: ColumnConfig): void {
    column.visible = !column.visible;
  }

  toggleFilter(filter: AthleteFilterConfig): void {
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

  close(): void {
    this.closed.emit();
  }

  save(): void {
    this.settingsChange.emit({ columns: this.localColumns, filterConfigs: this.localFilterConfigs });
    this.close();
  }
}
