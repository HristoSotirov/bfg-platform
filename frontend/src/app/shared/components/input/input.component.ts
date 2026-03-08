import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: string = 'text';
  @Input() required = false;
  @Input() error = '';
  @Input() disabled = false;

  value = '';
  private onChange = (value: string) => {};
  private onTouched = () => {};

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

  onInput(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }

  get inputClasses(): string {
    const baseClasses = 'w-full px-3 py-2 border rounded-button focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
    const normalClasses = 'border-gray-300 focus:ring-bfg-blue focus:border-bfg-blue';
    const errorClasses = 'border-red-500 focus:ring-red-500 focus:border-red-500';
    const disabledClasses = this.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';

    return `${baseClasses} ${this.error ? errorClasses : normalClasses} ${disabledClasses}`.trim();
  }
}

