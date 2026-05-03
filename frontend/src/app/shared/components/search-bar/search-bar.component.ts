import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full" [class]="containerClasses">
      @if (showIcon) {
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          (click)="onSearchClick()"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
      }
      <input
        type="text"
        [ngModel]="searchValue"
        (ngModelChange)="onValueChange($event)"
        (keydown)="onSearchKeydown($event)"
        [placeholder]="placeholder"
        [class]="inputClasses"
        [class.pl-10]="showIcon"
        [class.pr-10]="showIcon && showClearButton && searchValue"
        [class.pr-4]="!showIcon || (!showClearButton || !searchValue)"
      />
      @if (showClearButton && searchValue) {
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          (click)="clearSearch()"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Търсене...';
  @Input() searchValue = '';
  @Input() showIcon = true;
  @Input() showClearButton = false;
  @Input() containerClasses = '';
  @Input() inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue';

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.trim() === b.trim()),
    ).subscribe((value) => {
      this.searchValueChange.emit(value.trim());
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  onValueChange(value: string): void {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.triggerSearch();
    }
  }

  onSearchClick(): void {
    this.triggerSearch();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchValueChange.emit('');
    this.searchChange.emit('');
    this.search.emit('');
  }

  private triggerSearch(): void {
    const trimmedValue = this.searchValue.trim();
    this.searchChange.emit(trimmedValue);
    this.search.emit(trimmedValue);
  }
}

