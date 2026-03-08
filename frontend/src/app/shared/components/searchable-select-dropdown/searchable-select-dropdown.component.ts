import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  forwardRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

class SearchableDropdownRegistry {
  private static openDropdowns: Set<any> = new Set();

  static register(dropdown: any): void {
    this.openDropdowns.add(dropdown);
  }

  static unregister(dropdown: any): void {
    this.openDropdowns.delete(dropdown);
  }

  static closeAllExcept(except: any): void {
    this.openDropdowns.forEach((dropdown) => {
      if (dropdown !== except && dropdown.isOpen) {
        dropdown.close();
      }
    });
  }
}

@Component({
  selector: 'app-searchable-select-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full">
      <!-- Trigger/Input Field -->
      <div
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white flex items-center transition-colors focus-within:ring-2 focus-within:ring-bfg-blue focus-within:border-bfg-blue min-h-[38px] box-border overflow-hidden"
        [class.bg-gray-100]="disabled"
        [class.cursor-not-allowed]="disabled"
      >
        <input
          #inputField
          type="text"
          [(ngModel)]="searchQuery"
          (input)="onSearchInput()"
          (focus)="onInputFocus()"
          (blur)="onInputBlur()"
          (click)="onInputClick()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          class="flex-1 min-w-0 bg-transparent border-none outline-none text-sm leading-normal m-0 p-0"
          [class.text-gray-400]="!selectedValue && !isOpen"
          [class.cursor-pointer]="!isOpen"
          [class.cursor-text]="isOpen"
        />
      </div>

      <!-- Dropdown -->
      @if (isOpen && !disabled) {
        <div
          class="absolute z-[100] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          [class.w-full]="!dropdownWidth"
          [style.width]="dropdownWidth"
          (mousedown)="onDropdownMouseDown($event)"
          (click)="$event.stopPropagation()"
        >
          <!-- Options List - Scrollable Container -->
          <div
            class="scrollbar-hover"
            [class.max-h-[96px]]="!noScroll"
            [class.overflow-y-auto]="!noScroll"
            [class.overflow-y-visible]="noScroll">
            @if (filteredOptions.length === 0) {
              <div class="px-3 py-2 text-sm text-gray-500">Няма опции</div>
            } @else {
              @for (option of filteredOptions; track option.value) {
                <button
                  type="button"
                  (mousedown)="selectOption(option, $event)"
                  [disabled]="option.disabled"
                  class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer transition-colors rounded-md"
                  [class.bg-bfg-blue]="isSelected(option.value)"
                  [class.bg-opacity-10]="isSelected(option.value)"
                  [class.text-bfg-blue]="isSelected(option.value)"
                  [class.opacity-50]="option.disabled"
                  [class.cursor-not-allowed]="option.disabled"
                  [class.hover:bg-gray-50]="!option.disabled"
                  [class.hover:bg-opacity-20]="option.disabled"
                >
                  <span class="truncate">{{ option.label }}</span>
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        max-width: 100%;
      }
      :host > div {
        width: 100%;
        box-sizing: border-box;
        max-width: 100%;
      }
      :host > div > div:first-child {
        box-sizing: border-box;
        max-width: 100%;
      }
      :host input {
        min-width: 0;
        width: 100%;
        max-width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectDropdownComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectDropdownComponent
  implements ControlValueAccessor, OnDestroy
{
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Изберете...';
  @Input() disabled = false;
  @Input() dropdownWidth?: string; // Optional custom width for dropdown menu
  @Input() noScroll = false; // If true, remove max-height and show all options without scroll

  @Output() selectionChange = new EventEmitter<string>();

  @ViewChild('inputField') inputField?: ElementRef<HTMLInputElement>;

  isOpen = false;
  selectedValue: string | null = null;
  searchQuery = '';
  isTyping = false;
  private optionClicked = false;
  private arrowClicked = false;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    SearchableDropdownRegistry.register(this);
  }

  ngOnDestroy(): void {
    SearchableDropdownRegistry.unregister(this);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.isOpen && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }


  get filteredOptions(): SearchableSelectOption[] {
    if (!this.searchQuery.trim()) {
      return this.options;
    }

    const query = this.searchQuery.toLowerCase().trim();
    return this.options.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }

  toggle(event: MouseEvent): void {
    if (this.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    
    this.arrowClicked = true;

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
    
    setTimeout(() => {
      this.arrowClicked = false;
    }, 100);
  }

  open(): void {
    if (this.disabled) return;

    SearchableDropdownRegistry.closeAllExcept(this);

    this.isOpen = true;
    this.optionClicked = false;
    this.searchQuery = '';
    this.isTyping = false;
    this.cdr.markForCheck();

    setTimeout(() => {
      if (this.inputField?.nativeElement) {
        this.inputField.nativeElement.focus();
      }
    }, 0);
  }

  close(): void {
    if (this.isOpen) {
      this.isOpen = false;

      if (this.selectedValue) {
        const option = this.options.find((o) => o.value === this.selectedValue);
        this.searchQuery = option?.label || '';
      } else {
        this.searchQuery = '';
      }
      this.isTyping = false;

      this.optionClicked = false;
      this.onTouched();
      this.cdr.markForCheck();
    }
  }

  onInputFocus(): void {
    if (!this.isOpen) {
      this.open();
    }
  }

  onInputClick(): void {
    if (!this.isOpen) {
      this.open();
    }
  }

  onInputBlur(): void {
    setTimeout(() => {
      if (this.isOpen && !this.optionClicked && !this.arrowClicked) {
        this.close();
      }
    }, 150);
  }

  onDropdownMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  onSearchInput(): void {
    this.isTyping = true;
    if (!this.isOpen) {
      this.open();
    }
    this.cdr.markForCheck();
  }

  isSelected(value: string): boolean {
    return this.selectedValue === value;
  }

  selectOption(option: SearchableSelectOption, event?: MouseEvent): void {
    if (option.disabled) return;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.optionClicked = true;
    this.selectedValue = option.value;
    this.searchQuery = option.label;
    this.isTyping = false;
    this.onChange(this.selectedValue);
    this.selectionChange.emit(this.selectedValue);
    
    setTimeout(() => {
      this.close();
      if (this.inputField?.nativeElement) {
        this.inputField.nativeElement.blur();
      }
    }, 0);
    
    this.cdr.markForCheck();
  }

  writeValue(value: string | null | undefined): void {
    if (value === null || value === undefined || value === '') {
      this.selectedValue = null;
      this.searchQuery = '';
    } else {
      this.selectedValue = String(value);
      const option = this.options.find((o) => o.value === this.selectedValue);
      this.searchQuery = option?.label || '';
    }
    this.isTyping = false;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

