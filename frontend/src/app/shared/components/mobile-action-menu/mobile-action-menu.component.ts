import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MobileActionMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  visible?: boolean;
}

@Component({
  selector: 'app-mobile-action-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sm:hidden relative mobile-menu-container" #menuContainer>
      <button
        type="button"
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        (click)="toggleMenu()"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>

      <!-- Dropdown menu -->
      @if (isOpen) {
        <div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div class="py-1">
            @for (item of visibleItems; track item.label) {
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="item.disabled"
                (click)="handleItemClick(item)"
              >
                {{ item.label }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileActionMenuComponent {
  @Input() items: MobileActionMenuItem[] = [];
  @Input() isOpen = false;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() menuToggle = new EventEmitter<boolean>();
  @Output() itemClick = new EventEmitter<MobileActionMenuItem>();

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  get visibleItems(): MobileActionMenuItem[] {
    return this.items.filter(item => item.visible !== false);
  }

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
    this.isOpenChange.emit(this.isOpen);
    this.menuToggle.emit(this.isOpen);
    this.cdr.markForCheck();
  }

  handleItemClick(item: MobileActionMenuItem): void {
    if (!item.disabled) {
      item.action();
      this.isOpen = false;
      this.isOpenChange.emit(false);
      this.menuToggle.emit(false);
      this.itemClick.emit(item);
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.isOpen && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen = false;
      this.isOpenChange.emit(false);
      this.menuToggle.emit(false);
      this.cdr.markForCheck();
    }
  }
}

