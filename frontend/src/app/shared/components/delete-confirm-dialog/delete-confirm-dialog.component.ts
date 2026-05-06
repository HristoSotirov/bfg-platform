import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogComponent } from '../dialog/dialog.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, DialogComponent, ButtonComponent],
  template: `
    <app-dialog [isOpen]="isOpen" [title]="'common.deleteConfirm.title' | translate" (closed)="closed.emit()">
      <div class="py-4">
        <p class="text-gray-700 mb-6">
          {{ 'common.deleteConfirm.message' | translate }}
          <strong>{{ itemName }}</strong>? {{ 'common.deleteConfirm.irreversible' | translate }}
        </p>
        @if (error) {
          <div class="mb-6 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2">
            <p class="text-sm text-red-700">{{ error }}</p>
            <button type="button" class="text-red-400 hover:text-red-600 flex-shrink-0" (click)="errorDismissed.emit()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }
        <div class="flex gap-3 justify-center">
          <app-button variant="outline" size="md" [text]="'common.cancel' | translate" [disabled]="deleting" (click)="closed.emit()"></app-button>
          <app-button variant="danger" size="md" [text]="(deleting ? 'common.deleting' : 'common.delete') | translate" [disabled]="deleting" (click)="confirmed.emit()"></app-button>
        </div>
      </div>
    </app-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() itemName = '';
  @Input() deleting = false;
  @Input() error: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() errorDismissed = new EventEmitter<void>();
}
