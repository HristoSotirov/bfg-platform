import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>

      <!-- Dialog content -->
      <div [class]="dialogClasses" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0"
        >
          <h2 class="text-xl font-semibold text-gray-900 truncate mr-4">
            {{ title }}
          </h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            (click)="close()"
          >
            <svg
              class="w-6 h-6"
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
        </div>

        <!-- Body -->
        <div [class]="noScroll ? 'px-6 py-4 overflow-hidden flex-1 min-h-0 flex flex-col dialog-body' : 'px-6 py-4 flex-1 min-h-0 flex flex-col dialog-body'">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      :host ::ng-deep .dialog-body > .dialog-footer,
      :host ::ng-deep .dialog-body > div:last-child[class*="border-t"] {
        flex-shrink: 0;
        background: white;
        margin-top: 1.5rem;
        margin-left: -1.5rem;
        margin-right: -1.5rem;
        margin-bottom: -1rem;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
        padding-bottom: 1rem;
        padding-top: 1rem;
      }
      :host ::ng-deep .dialog-body > div:not(.dialog-footer):not(:last-child[class*="border-t"]) {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }
    `,
  ],
})
export class DialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: DialogSize = 'md';
  /** When true, body has no scroll (overflow hidden). Use when content is fixed height. */
  @Input() noScroll = false;
  @Output() closed = new EventEmitter<void>();

  get dialogClasses(): string {
    const baseClasses =
      'relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col';

    const sizeClasses: Record<DialogSize, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
    };

    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
