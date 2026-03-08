import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'transparent' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <button
      *ngIf="!routerLink"
      [class]="buttonClasses"
      [disabled]="disabled"
      [type]="type"
      [title]="title || ''">
      {{ text }}
    </button>
    <a
      *ngIf="routerLink"
      [routerLink]="routerLink"
      [class]="buttonClasses"
      [attr.aria-disabled]="disabled"
      [tabindex]="disabled ? -1 : 0"
      [title]="title || ''"
      (click)="disabled && $event.preventDefault()">
      {{ text }}
    </a>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() text = '';
  @Input() title: string | null = null;
  @Input() routerLink: string | string[] | null = null;

  @HostBinding('class.w-full')
  @Input() fullWidth = false;

  get buttonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none whitespace-nowrap';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-bfg-blue text-white hover:opacity-90',
      outline: 'border border-bfg-blue text-bfg-blue bg-white hover:bg-bfg-blue hover:text-white',
      secondary: 'border border-gray-300 text-gray-600 bg-white hover:bg-gray-50',
      transparent: 'text-gray-700 hover:bg-gray-100',
      white: 'bg-white border border-bfg-blue text-bfg-blue hover:bg-bfg-blue hover:text-white',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    };

    const widthClass = this.fullWidth ? 'w-full' : '';
    const disabledClass = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

    return `${baseClasses} ${variantClasses[this.variant]} ${sizeClasses[this.size]} ${widthClass} ${disabledClass}`.trim();
  }
}
