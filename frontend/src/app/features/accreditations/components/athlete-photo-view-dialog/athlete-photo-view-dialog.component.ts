import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';

export interface AthletePhotoViewInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  raceGroup: string;
  lastAccreditationClub: string;
  lastAccreditationYear: number;
  lastAccreditationStatus: string;
}

@Component({
  selector: 'app-athlete-photo-view-dialog',
  standalone: true,
  imports: [CommonModule, DialogComponent],
  templateUrl: './athlete-photo-view-dialog.component.html',
  styleUrl: './athlete-photo-view-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthletePhotoViewDialogComponent {
  @Input() isOpen = false;
  @Input() photoUrl: string | null = null;
  @Input() athleteInfo: AthletePhotoViewInfo | null = null;
  @Input() photoUploadedAt: string | null = null;
  @Input() photoUploadedByName: string | null = null;
  @Input() canPrev = false;
  @Input() canNext = false;

  @Output() closed = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onPrev(): void {
    if (this.canPrev) {
      this.prev.emit();
    }
  }

  onNext(): void {
    if (this.canNext) {
      this.next.emit();
    }
  }
}
