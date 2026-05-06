import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  forwardRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { OverlayModule, Overlay, ScrollStrategy, ConnectedPosition } from '@angular/cdk/overlay';
import { TranslateModule } from '@ngx-translate/core';
import {
  Observable,
  Subject,
  debounceTime,
  switchMap,
  catchError,
  of,
  take,
} from 'rxjs';
import { ValueHelpDialogComponent, ValueHelpColumn } from '../value-help-dialog/value-help-dialog.component';

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
  imports: [CommonModule, FormsModule, OverlayModule, TranslateModule, ValueHelpDialogComponent],
  template: `
    <div class="w-full">
      <!-- Trigger/Input Field -->
      <div
        #trigger="cdkOverlayOrigin"
        cdkOverlayOrigin
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
        @if (hasValueHelp) {
          <button
            type="button"
            (mousedown)="openValueHelp($event)"
            class="flex-shrink-0 ml-1 p-0.5 text-gray-400 hover:text-bfg-blue transition-colors"
            [class.cursor-not-allowed]="disabled"
            [disabled]="disabled"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        }
      </div>

      <!-- CDK Overlay Dropdown -->
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="trigger"
        [cdkConnectedOverlayOpen]="isOpen && !disabled"
        [cdkConnectedOverlayPositions]="overlayPositions"
        [cdkConnectedOverlayPush]="true"
        [cdkConnectedOverlayHasBackdrop]="false"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        [cdkConnectedOverlayPanelClass]="'searchable-dropdown-panel'"
        (overlayOutsideClick)="onOverlayOutsideClick($event)"
        (detach)="close()"
      >
        <div
          class="bg-white border border-gray-200 rounded-lg shadow-lg w-max"
          [style.min-width.px]="triggerWidth"
          [style.max-width]="'90vw'"
          (mousedown)="onDropdownMouseDown($event)"
          (click)="$event.stopPropagation()"
        >
          <div
            class="overflow-y-auto scrollbar-hover"
            [style.max-height.px]="panelMaxHeight">
            @if (searchLoading) {
              <div class="px-3 py-2 text-sm text-gray-400 italic">{{ 'common.searching' | translate }}</div>
            } @else if (filteredOptions.length === 0) {
              <div class="px-3 py-2 text-sm text-gray-500">{{ 'common.noOptions' | translate }}</div>
            } @else {
              @for (option of filteredOptions; track option.value) {
                <button
                  type="button"
                  (mousedown)="selectOption(option, $event)"
                  [disabled]="option.disabled"
                  class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap"
                  [class.bg-bfg-blue]="isSelected(option.value)"
                  [class.bg-opacity-10]="isSelected(option.value)"
                  [class.text-bfg-blue]="isSelected(option.value)"
                  [class.opacity-50]="option.disabled"
                  [class.cursor-not-allowed]="option.disabled"
                >
                  {{ option.label }}
                </button>
              }
            }
          </div>
        </div>
      </ng-template>

      @if (hasValueHelp) {
        <app-value-help-dialog
          [isOpen]="isValueHelpOpen"
          [title]="valueHelpTitle || ''"
          [columns]="valueHelpColumns!"
          [searchFn]="valueHelpSearchFn!"
          [valueKey]="valueHelpValueKey"
          [labelKey]="valueHelpLabelKey"
          [disabledFn]="valueHelpDisabledFn"
          (closed)="onValueHelpClosed()"
          (selected)="onValueHelpSelected($event)"
        />
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
  implements ControlValueAccessor, OnInit, OnDestroy
{
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Изберете...';
  @Input() disabled = false;
  @Input() dropdownWidth?: string;
  @Input() noScroll = false;
  @Input() serverSearch?: (query: string) => Observable<SearchableSelectOption[]>;
  @Input() staticSearch?: () => Observable<SearchableSelectOption[]>;

  @Input() valueHelpTitle?: string;
  @Input() valueHelpColumns?: ValueHelpColumn[];
  @Input() valueHelpSearchFn?: (query: string) => Observable<any[]>;
  @Input() valueHelpValueKey = 'uuid';
  @Input() valueHelpLabelKey = 'displayName';
  @Input() valueHelpDisabledFn?: (item: any) => boolean;

  @Output() selectionChange = new EventEmitter<string>();

  @ViewChild('inputField') inputField?: ElementRef<HTMLInputElement>;
  @ViewChild('trigger', { read: ElementRef }) triggerEl?: ElementRef<HTMLElement>;

  isOpen = false;
  isValueHelpOpen = false;
  selectedValue: string | null = null;
  searchQuery = '';
  isTyping = false;
  searchLoading = false;
  private optionClicked = false;
  private arrowClicked = false;
  private searchSubject = new Subject<string>();

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
  ];

  scrollStrategy: ScrollStrategy;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private overlay: Overlay,
  ) {
    SearchableDropdownRegistry.register(this);
    this.scrollStrategy = this.overlay.scrollStrategies.reposition();
  }

  ngOnInit(): void {
    if (!this.serverSearch) return;
    this.searchSubject.pipe(
      debounceTime(500),
      switchMap((query) => {
        this.searchLoading = true;
        this.cdr.markForCheck();
        return this.serverSearch!(query).pipe(catchError(() => of([])));
      }),
    ).subscribe((results) => {
      this.options = results;
      this.searchLoading = false;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    SearchableDropdownRegistry.unregister(this);
    this.searchSubject.complete();
  }

  get triggerWidth(): number {
    return this.triggerEl?.nativeElement?.getBoundingClientRect().width ?? 200;
  }

  get panelMaxHeight(): number {
    if (this.noScroll) return 9999;
    const itemHeight = 36;
    const maxVisible = 10;
    const visibleCount = Math.min(this.filteredOptions.length || 1, maxVisible);
    return visibleCount * itemHeight;
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

    if (this.serverSearch) {
      this.searchLoading = true;
      this.options = [];
      this.cdr.markForCheck();
      this.searchSubject.next('');
    }

    if (this.staticSearch) {
      this.searchLoading = true;
      this.cdr.markForCheck();
      this.staticSearch().pipe(take(1)).subscribe((results) => {
        this.options = results;
        this.searchLoading = false;
        this.cdr.markForCheck();
      });
    }

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

  onOverlayOutsideClick(event: MouseEvent): void {
    if (this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }
    this.close();
  }

  onSearchInput(): void {
    this.isTyping = true;
    if (!this.isOpen) {
      this.open();
    }
    if (this.serverSearch) {
      this.searchSubject.next(this.searchQuery.trim());
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
      if (option) {
        this.searchQuery = option.label;
      } else if (this.serverSearch || this.staticSearch) {
        const loader = this.serverSearch ? this.serverSearch('') : this.staticSearch!();
        loader.pipe(take(1)).subscribe((results) => {
          this.options = results;
          const found = this.options.find((o) => o.value === this.selectedValue);
          this.searchQuery = found?.label || '';
          this.cdr.markForCheck();
        });
      } else {
        this.searchQuery = '';
      }
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

  get hasValueHelp(): boolean {
    return !!(this.valueHelpColumns && this.valueHelpSearchFn);
  }

  openValueHelp(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) return;
    this.close();
    this.isValueHelpOpen = true;
    this.cdr.markForCheck();
  }

  onValueHelpClosed(): void {
    this.isValueHelpOpen = false;
    this.cdr.markForCheck();
  }

  onValueHelpSelected(row: any): void {
    const value = row[this.valueHelpValueKey];
    const label = row[this.valueHelpLabelKey] || '';
    this.selectedValue = value;
    this.searchQuery = label;
    this.isTyping = false;
    this.isValueHelpOpen = false;
    this.onChange(this.selectedValue);
    if (this.selectedValue) {
      this.selectionChange.emit(this.selectedValue);
    }
    this.cdr.markForCheck();
  }
}
