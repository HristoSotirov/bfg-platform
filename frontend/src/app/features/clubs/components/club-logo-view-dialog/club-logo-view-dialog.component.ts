import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';

export interface ClubLogoViewInfo {
  shortName: string;
  name: string;
}

@Component({
  selector: 'app-club-logo-view-dialog',
  standalone: true,
  imports: [CommonModule, DialogComponent],
  templateUrl: './club-logo-view-dialog.component.html',
  styleUrl: './club-logo-view-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubLogoViewDialogComponent {
  @Input() isOpen = false;
  @Input() logoUrl: string | null = null;
  @Input() clubInfo: ClubLogoViewInfo | null = null;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
