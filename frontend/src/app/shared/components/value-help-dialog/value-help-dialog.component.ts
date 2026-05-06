import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, debounceTime, switchMap, catchError, of } from 'rxjs';
import { DialogComponent } from '../dialog/dialog.component';

export interface ValueHelpColumn {
  key: string;
  label: string;
}

@Component({
  selector: 'app-value-help-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogComponent],
  template: `
    <app-dialog [isOpen]="isOpen" [title]="title" size="lg" (closed)="close()">
      <div class="flex flex-col gap-4 h-full">
        <!-- Search input -->
        <div class="flex-shrink-0">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            [placeholder]="'common.search' | translate"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue"
          />
        </div>

        <!-- Table -->
        <div class="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg">
          @if (loading) {
            <div class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-bfg-blue"></div>
            </div>
          } @else if (rows.length === 0) {
            <div class="text-center py-12 text-sm text-gray-500">
              {{ 'common.noData' | translate }}
            </div>
          } @else {
            <table class="w-full text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  @for (col of columns; track col.key) {
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {{ col.label }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (row of rows; track row[valueKey]) {
                  <tr
                    class="transition-colors"
                    [class.hover:bg-gray-50]="!isRowDisabled(row)"
                    [class.cursor-pointer]="!isRowDisabled(row)"
                    [class.opacity-40]="isRowDisabled(row)"
                    [class.cursor-not-allowed]="isRowDisabled(row)"
                    (click)="selectRow(row)"
                  >
                    @for (col of columns; track col.key) {
                      <td class="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {{ row[col.key] ?? '-' }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </app-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueHelpDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() columns: ValueHelpColumn[] = [];
  @Input() searchFn!: (query: string) => Observable<any[]>;
  @Input() valueKey = 'uuid';
  @Input() labelKey = 'label';
  @Input() disabledFn?: (item: any) => boolean;

  @Output() closed = new EventEmitter<void>();
  @Output() selected = new EventEmitter<any>();

  searchQuery = '';
  rows: any[] = [];
  loading = false;

  private searchSubject = new Subject<string>();

  constructor(private cdr: ChangeDetectorRef) {
    this.searchSubject.pipe(
      debounceTime(400),
      switchMap((query) => {
        this.loading = true;
        this.cdr.markForCheck();
        return this.searchFn(query).pipe(catchError(() => of([])));
      }),
    ).subscribe((results) => {
      this.rows = results;
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.searchQuery = '';
      this.rows = [];
      this.loading = true;
      this.cdr.markForCheck();
      this.searchSubject.next('');
    }
  }

  onSearch(query: string): void {
    this.searchSubject.next(query.trim());
  }

  isRowDisabled(row: any): boolean {
    return this.disabledFn ? this.disabledFn(row) : false;
  }

  selectRow(row: any): void {
    if (this.isRowDisabled(row)) return;
    this.selected.emit(row);
    this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
