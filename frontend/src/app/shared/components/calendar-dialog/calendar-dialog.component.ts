import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>

      <!-- Calendar Dialog -->
      <div
        class="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header with month/year navigation -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            type="button"
            class="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="previousMonth()"
            title="Предишен месец"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <div class="flex items-center gap-2">
            <select
              [(ngModel)]="selectedMonth"
              (change)="onMonthChange()"
              class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue"
            >
              @for (month of months; track month.value) {
                <option [value]="month.value">{{ month.label }}</option>
              }
            </select>
            
            <select
              [(ngModel)]="selectedYear"
              (change)="onYearChange()"
              class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue"
            >
              @for (year of years; track year) {
                <option [value]="year">{{ year }}</option>
              }
            </select>
          </div>
          
          <button
            type="button"
            class="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="nextMonth()"
            title="Следващ месец"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        <!-- Calendar Grid -->
        <div class="p-4">
          <!-- Day names header -->
          <div class="grid grid-cols-7 gap-1 mb-2">
            @for (dayName of dayNames; track dayName) {
              <div class="text-center text-xs font-medium text-gray-500 py-1">
                {{ dayName }}
              </div>
            }
          </div>

          <!-- Calendar days -->
          <div class="grid grid-cols-7 gap-1">
            @for (day of calendarDays; track day.date) {
              <button
                type="button"
                [class]="getDayClasses(day)"
                [disabled]="day.disabled"
                (click)="selectDate(day)"
                [title]="day.disabled ? 'Недостъпна дата' : ''"
              >
                {{ day.day }}
              </button>
            }
          </div>
        </div>

        <!-- Footer with actions -->
        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="clearDate()"
          >
            Изчисти
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm bg-bfg-blue text-white hover:opacity-90 rounded-lg transition-colors"
            (click)="close()"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class CalendarDialogComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selectedDate: string | null = null;
  @Input() min: string | null = null;
  @Input() max: string | null = null;

  @Output() dateSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  currentDate: Date = new Date();
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();

  dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  
  months = [
    { value: 0, label: 'Януари' },
    { value: 1, label: 'Февруари' },
    { value: 2, label: 'Март' },
    { value: 3, label: 'Април' },
    { value: 4, label: 'Май' },
    { value: 5, label: 'Юни' },
    { value: 6, label: 'Юли' },
    { value: 7, label: 'Август' },
    { value: 8, label: 'Септември' },
    { value: 9, label: 'Октомври' },
    { value: 10, label: 'Ноември' },
    { value: 11, label: 'Декември' }
  ];

  get years(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  }

  get calendarDays(): CalendarDay[] {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: CalendarDay[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: '', date: '', disabled: true, isOtherMonth: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = this.formatDateString(date);
      const isSelected = this.selectedDate === dateString;
      const isToday = this.isToday(date);
      const isDisabled = this.isDateDisabled(date);

      days.push({
        day: day.toString(),
        date: dateString,
        disabled: isDisabled,
        isSelected,
        isToday,
        isOtherMonth: false
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ day: '', date: '', disabled: true, isOtherMonth: true });
    }

    return days;
  }

  ngOnInit(): void {
    this.updateSelectedMonthYear();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] || (changes['isOpen'] && this.isOpen)) {
      this.updateSelectedMonthYear();
    }
  }

  private updateSelectedMonthYear(): void {
    if (this.selectedDate) {
      const date = new Date(this.selectedDate + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        this.selectedMonth = date.getMonth();
        this.selectedYear = date.getFullYear();
      }
    } else {
      const today = new Date();
      this.selectedMonth = today.getMonth();
      this.selectedYear = today.getFullYear();
    }
  }

  previousMonth(): void {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
  }

  nextMonth(): void {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
  }

  onMonthChange(): void {
  }

  onYearChange(): void {
  }

  selectDate(day: CalendarDay): void {
    if (!day.disabled && day.date) {
      this.dateSelected.emit(day.date);
      this.close();
    }
  }

  clearDate(): void {
    this.dateSelected.emit('');
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  getDayClasses(day: CalendarDay): string {
    const baseClasses = 'w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors';
    
    if (day.disabled || day.isOtherMonth) {
      return `${baseClasses} text-gray-300 cursor-not-allowed`;
    }
    
    if (day.isSelected) {
      return `${baseClasses} bg-bfg-blue text-white font-medium hover:bg-bfg-blue`;
    }
    
    if (day.isToday) {
      return `${baseClasses} bg-gray-100 text-gray-900 font-medium hover:bg-gray-200`;
    }
    
    return `${baseClasses} text-gray-700 hover:bg-gray-100`;
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  private isDateDisabled(date: Date): boolean {
    if (this.min) {
      const minDate = new Date(this.min + 'T00:00:00');
      minDate.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      if (compareDate < minDate) {
        return true;
      }
    }
    
    if (this.max) {
      const maxDate = new Date(this.max + 'T00:00:00');
      maxDate.setHours(23, 59, 59, 999);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      if (compareDate > maxDate) {
        return true;
      }
    }
    
    return false;
  }
}

interface CalendarDay {
  day: string;
  date: string;
  disabled: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isOtherMonth?: boolean;
}

