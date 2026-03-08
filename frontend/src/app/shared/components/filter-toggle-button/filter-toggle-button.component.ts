import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter-toggle-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="sm:hidden flex justify-center mt-2">
        <button
          type="button"
          class="flex items-center gap-1 px-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          (click)="toggle()"
        >
          <span>{{ label }}</span>
          <svg
            class="w-4 h-4 transition-transform"
            [class.rotate-180]="expanded"
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
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterToggleButtonComponent {
  @Input() expanded = false;
  @Input() visible = true;
  @Input() label = 'Филтри';

  @Output() toggleChange = new EventEmitter<boolean>();

  toggle(): void {
    this.expanded = !this.expanded;
    this.toggleChange.emit(this.expanded);
  }
}

