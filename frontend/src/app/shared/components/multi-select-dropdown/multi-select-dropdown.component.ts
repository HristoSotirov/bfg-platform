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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

export interface DropdownOption {
  value: string;
  label: string;
}

// Static registry to track all open dropdowns
class DropdownRegistry {
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
  selector: 'app-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (click)="toggle($event)">
      <!-- Trigger -->
      <div
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors"
        [class.border-bfg-blue]="isOpen"
        [class.ring-2]="isOpen"
        [class.ring-bfg-blue]="isOpen"
        [class.bg-gray-100]="disabled"
        [class.cursor-not-allowed]="disabled"
      >
        <span
          class="truncate"
          [class.text-gray-400]="selectedValues.length === 0"
        >
          {{ displayText }}
        </span>
        <svg
          class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
          [class.rotate-180]="isOpen"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </div>

      <!-- Dropdown -->
      @if (isOpen && !disabled) {
        <div
          class="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          [class.w-full]="!twoColumnLayout"
          [class.w-[360px]]="twoColumnLayout"
          [class.left-0]="twoColumnLayout"
          (click)="$event.stopPropagation()"
        >
          @if (options.length === 0) {
            <div class="px-3 py-2 text-sm text-gray-500">Няма опции</div>
          } @else {
            <!-- Clear All Option -->
            @if (multiple) {
              <button
                type="button"
                (click)="clearAll()"
                class="w-full px-3 py-1.5 text-xs text-bfg-blue hover:bg-gray-50 cursor-pointer transition-colors text-left bg-white"
                [class.opacity-50]="selectedValues.length === 0"
                [class.cursor-not-allowed]="selectedValues.length === 0"
              >
                Изчисти всички
              </button>
            }
            
            @if (twoColumnLayout) {
              <!-- Two Column Layout for Race Groups -->
              <div class="grid grid-cols-2 divide-x divide-gray-200">
                <!-- Men's Column -->
                <div class="py-1">
                  <div class="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50">Мъже</div>
                  @for (option of menOptions; track option.value) {
                    <label
                      class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                      [class.bg-bfg-blue]="isSelected(option.value)"
                      [class.bg-opacity-10]="isSelected(option.value)"
                      [class.text-bfg-blue]="isSelected(option.value)"
                    >
                      @if (multiple) {
                        <input
                          type="checkbox"
                          [checked]="isSelected(option.value)"
                          (change)="toggleOption(option.value)"
                          class="h-4 w-4 text-bfg-blue border-gray-300 rounded focus:ring-bfg-blue"
                        />
                      }
                      <span class="truncate">{{ option.label }}</span>
                    </label>
                  }
                </div>
                
                <!-- Women's Column -->
                <div class="py-1">
                  <div class="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50">Жени</div>
                  @for (option of womenOptions; track option.value) {
                    <label
                      class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                      [class.bg-bfg-blue]="isSelected(option.value)"
                      [class.bg-opacity-10]="isSelected(option.value)"
                      [class.text-bfg-blue]="isSelected(option.value)"
                    >
                      @if (multiple) {
                        <input
                          type="checkbox"
                          [checked]="isSelected(option.value)"
                          (change)="toggleOption(option.value)"
                          class="h-4 w-4 text-bfg-blue border-gray-300 rounded focus:ring-bfg-blue"
                        />
                      }
                      <span class="truncate">{{ option.label }}</span>
                    </label>
                  }
                </div>
              </div>
            } @else {
              <!-- Single Column Layout -->
              @for (option of options; track option.value) {
                <label
                  class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                  [class.bg-bfg-blue]="isSelected(option.value)"
                  [class.bg-opacity-10]="isSelected(option.value)"
                  [class.text-bfg-blue]="isSelected(option.value)"
                >
                  @if (multiple) {
                    <input
                      type="checkbox"
                      [checked]="isSelected(option.value)"
                      (change)="toggleOption(option.value)"
                      class="h-4 w-4 text-bfg-blue border-gray-300 rounded focus:ring-bfg-blue"
                    />
                  }
                  <span class="truncate">{{ option.label }}</span>
                </label>
              }
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectDropdownComponent),
      multi: true,
    },
  ],
})
export class MultiSelectDropdownComponent implements ControlValueAccessor, OnDestroy {
  @Input() options: DropdownOption[] = [];
  @Input() placeholder = 'Изберете...';
  @Input() multiple = true;
  @Input() disabled = false;
  @Input() twoColumnLayout = false; // Enable 2-column layout for race groups

  @Output() selectionChange = new EventEmitter<string[]>();

  isOpen = false;
  selectedValues: string[] = [];

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    // Register this dropdown instance
    DropdownRegistry.register(this);
  }

  ngOnDestroy(): void {
    // Unregister when component is destroyed
    DropdownRegistry.unregister(this);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  get displayText(): string {
    if (this.selectedValues.length === 0) {
      return this.placeholder;
    }

    if (this.selectedValues.length === 1) {
      const option = this.options.find(
        (o) => o.value === this.selectedValues[0],
      );
      return option?.label || this.selectedValues[0];
    }

    return `${this.selectedValues.length} избрани`;
  }

  get menOptions(): DropdownOption[] {
    return this.options.filter((opt) => opt.value.startsWith('M'));
  }

  get womenOptions(): DropdownOption[] {
    return this.options.filter((opt) => opt.value.startsWith('W'));
  }

  toggle(event: Event): void {
    if (this.disabled) return;
    event.stopPropagation();
    
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled) return;
    
    // Close all other open dropdowns before opening this one
    DropdownRegistry.closeAllExcept(this);
    
    this.isOpen = true;
    this.cdr.markForCheck();
  }

  close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.onTouched();
      this.cdr.markForCheck();
    }
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  toggleOption(value: string): void {
    if (this.multiple) {
      if (this.isSelected(value)) {
        this.selectedValues = this.selectedValues.filter((v) => v !== value);
      } else {
        this.selectedValues = [...this.selectedValues, value];
      }
    } else {
      this.selectedValues = [value];
      this.isOpen = false;
    }

    this.onChange(this.selectedValues);
    this.selectionChange.emit(this.selectedValues);
    this.cdr.markForCheck();
  }

  clearAll(): void {
    if (!this.multiple || this.selectedValues.length === 0) return;
    
    this.selectedValues = [];
    this.onChange(this.selectedValues);
    this.selectionChange.emit(this.selectedValues);
    this.cdr.markForCheck();
  }

  // ControlValueAccessor implementation
  writeValue(value: string | string[] | null | undefined): void {
    if (value === null || value === undefined) {
      this.selectedValues = [];
    } else if (Array.isArray(value)) {
      // Ensure we have a valid array (filter out any null/undefined values)
      this.selectedValues = value.filter((v) => v != null && v !== '');
    } else {
      this.selectedValues = value ? [String(value)] : [];
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
