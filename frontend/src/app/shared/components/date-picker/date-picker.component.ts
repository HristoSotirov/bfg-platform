import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CalendarDialogComponent } from '../calendar-dialog/calendar-dialog.component';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarDialogComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  template: `
    <div class="w-full">
      <label *ngIf="hasLabel" [class]="labelClasses">
        {{ label }}
        <span *ngIf="required" class="text-red-500">*</span>
      </label>
      <div class="relative">
        <div
          [class]="containerClasses"
          (click)="openDatePicker()"
        >
          <span [class.text-gray-400]="!value" [class.text-gray-900]="value" class="leading-normal">
            {{ displayValue }}
          </span>
          <svg
            [class]="iconClasses"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
        </div>
      </div>
      <p *ngIf="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>
    
    <!-- Calendar Dialog -->
    <app-calendar-dialog
      [isOpen]="isCalendarOpen"
      [selectedDate]="value"
      [min]="min"
      [max]="max"
      (dateSelected)="onCalendarDateSelected($event)"
      (closed)="closeCalendar()"
    ></app-calendar-dialog>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Изберете дата';
  @Input() required = false;
  @Input() error = '';
  @Input() disabled = false;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() size: 'sm' | 'md' = 'md';

  value: string = '';
  isCalendarOpen = false;
  private onChange = (value: string) => {};
  private onTouched = () => {};

  get hasLabel(): boolean {
    return !!this.label && this.label.trim().length > 0;
  }

  get labelClasses(): string {
    if (this.size === 'sm') {
      return 'block text-xs text-gray-500 mb-0.5';
    }
    return 'block text-sm font-medium text-gray-700 mb-1';
  }

  get containerClasses(): string {
    const paddingClasses = this.size === 'sm' 
      ? 'px-2 py-1' 
      : 'px-3 py-2';
    const roundedClasses = this.size === 'sm'
      ? 'rounded'
      : 'rounded-lg';
    const baseClasses = `w-full ${paddingClasses} border border-gray-300 ${roundedClasses} text-sm bg-white cursor-pointer flex items-center justify-between gap-2 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-bfg-blue focus-within:border-bfg-blue min-h-[38px]`;
    const stateClasses = this.disabled
      ? 'bg-gray-100 cursor-not-allowed opacity-50'
      : '';
    
    return `${baseClasses} ${stateClasses}`.trim();
  }

  get iconClasses(): string {
    const sizeClasses = this.size === 'sm'
      ? 'w-4 h-4'
      : 'w-5 h-5';
    const colorClasses = this.disabled
      ? 'text-gray-300'
      : 'text-gray-400';
    return `${sizeClasses} ${colorClasses} flex-shrink-0`;
  }

  get displayValue(): string {
    if (!this.value) {
      return this.placeholder;
    }
    
    try {
      const date = new Date(this.value + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return this.value;
      }
      
      return date.toLocaleDateString('bg-BG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return this.value;
    }
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }


  openDatePicker(): void {
    if (!this.disabled) {
      this.isCalendarOpen = true;
    }
  }

  onCalendarDateSelected(date: string): void {
    this.value = date;
    this.onChange(this.value);
    this.onTouched();
  }

  closeCalendar(): void {
    this.isCalendarOpen = false;
  }
}

