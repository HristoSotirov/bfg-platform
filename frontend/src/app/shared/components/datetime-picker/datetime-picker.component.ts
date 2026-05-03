import { Component, Input, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CalendarDialogComponent } from '../calendar-dialog/calendar-dialog.component';

/**
 * DateTime picker that matches the style of DatePickerComponent.
 * Value is a UTC ISO-8601 string: "YYYY-MM-DDTHH:MM:SS Z".
 * All display and input is in Europe/Sofia local time (handles DST automatically).
 */
@Component({
  selector: 'app-datetime-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarDialogComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="w-full">
      <label *ngIf="hasLabel" [class]="labelClasses">
        {{ label }}
        <span *ngIf="required" class="text-red-500">*</span>
      </label>
      <!-- Trigger field -->
      <div
        [class]="containerClasses"
        (click)="openPicker()"
      >
        <span [class.text-gray-400]="!displayValue" [class.text-gray-900]="displayValue" class="leading-normal truncate flex-1 min-w-0">
          {{ displayValue || placeholder }}
        </span>
        <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
    </div>

    <!-- Calendar + time picker dialog -->
    <div *ngIf="isPickerOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="onBackdropClick($event)">
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col" (click)="$event.stopPropagation()">

        <!-- Calendar header + grid (re-use CalendarDialogComponent internals inline) -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button type="button" class="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" (click)="previousMonth()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div class="flex items-center gap-2">
            <select [(ngModel)]="selectedMonth" (change)="rebuildCalendar()"
              class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue">
              @for (m of months; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
            <select [(ngModel)]="selectedYear" (change)="rebuildCalendar()"
              class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue">
              @for (y of years; track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
          </div>
          <button type="button" class="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" (click)="nextMonth()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        <div class="p-4">
          <div class="grid grid-cols-7 gap-1 mb-2">
            @for (d of dayNames; track d) {
              <div class="text-center text-xs font-medium text-gray-500 py-1">{{ d }}</div>
            }
          </div>
          <div class="grid grid-cols-7 gap-1">
            @for (day of calendarDays; track day.date) {
              <button type="button" [class]="getDayClasses(day)" [disabled]="day.disabled" (click)="selectDay(day)">
                {{ day.day }}
              </button>
            }
          </div>
        </div>

        <!-- Time picker row -->
        <div class="flex items-center gap-3 px-4 pb-3 border-b border-gray-200">
          <span class="text-sm text-gray-600 flex-shrink-0">Час:</span>
          <select [(ngModel)]="pickerHour"
            class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue w-20">
            @for (h of hours; track h) {
              <option [value]="h">{{ h | number:'2.0-0' }}</option>
            }
          </select>
          <span class="text-gray-500">:</span>
          <select [(ngModel)]="pickerMinute"
            class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue w-20">
            @for (m of minutes; track m) {
              <option [value]="m">{{ m | number:'2.0-0' }}</option>
            }
          </select>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-4 py-3">
          <button type="button" class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" (click)="clearValue()">
            Изчисти
          </button>
          <button type="button" class="px-4 py-2 text-sm bg-bfg-blue text-white hover:opacity-90 rounded-lg transition-colors" (click)="confirmSelection()">
            Потвърди
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class DateTimePickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Изберете дата и час';
  @Input() required = false;
  @Input() disabled = false;
  @Input() size: 'sm' | 'md' = 'md';

  private static readonly TZ = 'Europe/Sofia';

  value = '';
  isPickerOpen = false;

  // Calendar state (all in Sofia local time)
  selectedMonth = new Date().getMonth();
  selectedYear = new Date().getFullYear();
  pickedDate = ''; // YYYY-MM-DD in Sofia local
  pickerHour = 0;
  pickerMinute = 0;

  readonly dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  readonly months = [
    { value: 0, label: 'Януари' }, { value: 1, label: 'Февруари' },
    { value: 2, label: 'Март' }, { value: 3, label: 'Април' },
    { value: 4, label: 'Май' }, { value: 5, label: 'Юни' },
    { value: 6, label: 'Юли' }, { value: 7, label: 'Август' },
    { value: 8, label: 'Септември' }, { value: 9, label: 'Октомври' },
    { value: 10, label: 'Ноември' }, { value: 11, label: 'Декември' },
  ];
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  get years(): number[] {
    const y = new Date().getFullYear();
    const result: number[] = [];
    for (let i = y - 5; i <= y + 10; i++) result.push(i);
    return result;
  }

  private onChange = (_: string) => {};
  private onTouched = () => {};

  get hasLabel(): boolean { return !!this.label?.trim(); }

  get labelClasses(): string {
    return this.size === 'sm'
      ? 'block text-xs text-gray-500 mb-0.5'
      : 'block text-sm font-medium text-gray-700 mb-1';
  }

  get containerClasses(): string {
    const pad = this.size === 'sm' ? 'px-2 py-1' : 'px-3 py-2';
    const radius = this.size === 'sm' ? 'rounded' : 'rounded-lg';
    const base = `w-full ${pad} border border-gray-300 ${radius} text-sm bg-white cursor-pointer flex items-center justify-between gap-2 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-bfg-blue focus-within:border-bfg-blue min-h-[38px]`;
    const state = this.disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : '';
    return `${base} ${state}`.trim();
  }

  get displayValue(): string {
    if (!this.value) return '';
    try {
      const d = new Date(this.value);
      if (isNaN(d.getTime())) return this.value;
      return d.toLocaleString('bg-BG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: DateTimePickerComponent.TZ,
      });
    } catch { return this.value; }
  }

  get calendarDays(): CalDay[] {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = (firstDow + 6) % 7; // Monday-first grid
    const days: CalDay[] = [];

    for (let i = 0; i < startDow; i++) days.push({ day: '', date: '', disabled: true, isOtherMonth: true });

    const todayStr = this.sofiaDateStr(new Date());

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: String(d), date: dateStr, disabled: false, isSelected: dateStr === this.pickedDate, isToday: dateStr === todayStr });
    }

    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) days.push({ day: '', date: '', disabled: true, isOtherMonth: true });
    return days;
  }

  getDayClasses(day: CalDay): string {
    const base = 'w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors';
    if (day.disabled || day.isOtherMonth) return `${base} text-gray-300 cursor-not-allowed`;
    if (day.isSelected) return `${base} bg-bfg-blue text-white font-medium hover:bg-bfg-blue`;
    if (day.isToday) return `${base} bg-gray-100 text-gray-900 font-medium hover:bg-gray-200`;
    return `${base} text-gray-700 hover:bg-gray-100`;
  }

  openPicker(): void {
    if (this.disabled) return;
    if (this.value) {
      const d = new Date(this.value);
      if (!isNaN(d.getTime())) {
        const parts = this.sofiaParts(d);
        this.pickedDate = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
        this.selectedMonth = parts.month - 1;
        this.selectedYear = parts.year;
        this.pickerHour = parts.hour;
        this.pickerMinute = this.roundMinute(parts.minute);
      }
    } else {
      const parts = this.sofiaParts(new Date());
      this.selectedMonth = parts.month - 1;
      this.selectedYear = parts.year;
      this.pickedDate = '';
      this.pickerHour = 9;
      this.pickerMinute = 0;
    }
    this.isPickerOpen = true;
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.isPickerOpen = false;
  }

  previousMonth(): void {
    if (this.selectedMonth === 0) { this.selectedMonth = 11; this.selectedYear--; }
    else this.selectedMonth--;
  }

  nextMonth(): void {
    if (this.selectedMonth === 11) { this.selectedMonth = 0; this.selectedYear++; }
    else this.selectedMonth++;
  }

  rebuildCalendar(): void { /* triggers getter recalculation */ }

  selectDay(day: CalDay): void {
    if (!day.disabled && day.date) {
      this.pickedDate = day.date;
    }
  }

  confirmSelection(): void {
    if (!this.pickedDate) {
      this.isPickerOpen = false;
      return;
    }
    const [year, month, day] = this.pickedDate.split('-').map(Number);
    const utcMs = this.sofiaLocalToUtcMs(year, month, day, this.pickerHour, this.pickerMinute);
    const utc = new Date(utcMs);
    this.value = utc.toISOString().substring(0, 19) + 'Z';
    this.onChange(this.value);
    this.onTouched();
    this.isPickerOpen = false;
  }

  clearValue(): void {
    this.value = '';
    this.pickedDate = '';
    this.onChange('');
    this.onTouched();
    this.isPickerOpen = false;
  }

  writeValue(val: string): void {
    this.value = val || '';
  }

  registerOnChange(fn: (_: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  private sofiaParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: DateTimePickerComponent.TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value, 10);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
  }

  private sofiaDateStr(d: Date): string {
    const p = this.sofiaParts(d);
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }

  // Convert a Sofia wall-clock time to UTC milliseconds using the Intl offset trick
  private sofiaLocalToUtcMs(year: number, month: number, day: number, hour: number, minute: number): number {
    // Treat the input as UTC to get an approximate Date, then measure the Sofia offset at that moment
    const approxUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    const approxDate = new Date(approxUtc);
    const sofiaPartsAtApprox = this.sofiaParts(approxDate);
    const sofiaApproxUtc = Date.UTC(sofiaPartsAtApprox.year, sofiaPartsAtApprox.month - 1, sofiaPartsAtApprox.day, sofiaPartsAtApprox.hour, sofiaPartsAtApprox.minute, 0);
    const offsetMs = approxUtc - sofiaApproxUtc;
    return approxUtc + offsetMs;
  }

  private roundMinute(m: number): number {
    return Math.round(m / 5) * 5 % 60;
  }
}

interface CalDay {
  day: string;
  date: string;
  disabled: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isOtherMonth?: boolean;
}
