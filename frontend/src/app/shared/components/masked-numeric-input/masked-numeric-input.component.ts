import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-masked-numeric-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <input
      #inputEl
      type="text"
      inputmode="numeric"
      [value]="displayValue"
      [disabled]="disabled"
      [class]="inputClasses"
      (keydown)="onKeyDown($event)"
      (input)="onInput($event)"
      (focus)="onFocus()"
      (blur)="onBlur()"
      (paste)="onPaste($event)"
    />
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaskedNumericInputComponent),
      multi: true,
    },
  ],
})
export class MaskedNumericInputComponent implements ControlValueAccessor {
  @Input() mode: 'weight' | 'time' = 'weight';
  @Input() disabled = false;

  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  private raw = 0;
  focused = false;

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  get displayValue(): string {
    if (!this.focused && this.raw === 0) return '';
    return this.format(this.raw);
  }

  get inputClasses(): string {
    const base = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';
    const focus = 'focus:ring-2 focus:ring-bfg-blue focus:border-bfg-blue';
    const dis = this.disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white';
    return `${base} ${focus} ${dis}`;
  }

  private format(raw: number): string {
    if (this.mode === 'weight') {
      const decimal = (raw % 100).toString().padStart(2, '0');
      const integer = Math.floor(raw / 100).toString();
      return `${integer},${decimal}`;
    }
    const cc = (raw % 100).toString().padStart(2, '0');
    const ss = (Math.floor(raw / 100) % 100).toString().padStart(2, '0');
    const mm = Math.floor(raw / 10000).toString();
    return `${mm}:${ss},${cc}`;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      const digit = parseInt(event.key, 10);
      this.raw = this.raw * 10 + digit;
      this.updateAndEmit();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.raw = Math.floor(this.raw / 10);
      this.updateAndEmit();
    } else if (event.key === 'Delete') {
      event.preventDefault();
      this.raw = 0;
      this.updateAndEmit();
    } else if (event.key === 'Tab' || event.key === 'Escape' || event.key === 'Enter') {
      // allow default
    } else {
      event.preventDefault();
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.displayValue;
  }

  onFocus(): void {
    this.focused = true;
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
    this.cdr.markForCheck();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.disabled) return;

    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '');
    if (!digits) return;

    this.raw = parseInt(digits, 10) || 0;
    this.updateAndEmit();
  }

  private updateAndEmit(): void {
    this.cdr.markForCheck();
    this.onChange(this.rawToExternal(this.raw));
  }

  private rawToExternal(raw: number): number | null {
    if (raw === 0) return null;
    if (this.mode === 'weight') {
      return raw / 100;
    }
    const cc = raw % 100;
    const ss = Math.floor(raw / 100) % 100;
    const mm = Math.floor(raw / 10000);
    return (mm * 60 + ss) * 1000 + cc * 10;
  }

  private externalToRaw(val: number | null): number {
    if (val == null || val === 0) return 0;
    if (this.mode === 'weight') {
      return Math.round(val * 100);
    }
    const totalCs = Math.round(val / 10);
    const cc = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const ss = totalSec % 60;
    const mm = Math.floor(totalSec / 60);
    return mm * 10000 + ss * 100 + cc;
  }

  writeValue(value: number | null): void {
    this.raw = this.externalToRaw(value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
