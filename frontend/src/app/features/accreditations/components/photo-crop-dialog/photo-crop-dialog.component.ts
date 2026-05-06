import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { WheelZoomDirective } from '../../../../shared/directives/wheel-zoom.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-photo-crop-dialog',
  standalone: true,
  imports: [CommonModule, DialogComponent, ButtonComponent, WheelZoomDirective, TranslateModule],
  templateUrl: './photo-crop-dialog.component.html',
  styleUrl: './photo-crop-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoCropDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() sourceFile: File | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() cropped = new EventEmitter<Blob>();

  @ViewChild('cropImage') cropImageRef?: ElementRef<HTMLImageElement>;

  readonly templateSize = 340;
  readonly outputSize = 600;

  previewUrl: string | null = null;

  naturalWidth = 0;
  naturalHeight = 0;

  scale = 1;
  minScale = 1;
  maxScale = 4;

  offsetX = 0;
  offsetY = 0;

  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  cropError: string | null = null;
  confirming = false;

  readonly scaleStep = 0.1;
  readonly wheelScaleStep = 0.08;

  constructor(private cdr: ChangeDetectorRef, private translateService: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sourceFile'] || changes['isOpen']) {
      if (!this.isOpen || !this.sourceFile) {
        this.resetState();
      } else if (this.sourceFile) {
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = URL.createObjectURL(this.sourceFile);
        this.naturalWidth = 0;
        this.naturalHeight = 0;
        this.scale = 1;
        this.minScale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.cropError = null;
      }
      this.cdr.markForCheck();
    }
  }

  private resetState(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.scale = 1;
    this.minScale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.cropError = null;
    this.confirming = false;
  }

  get transformStyle(): string {
    return `translate(-50%, -50%) translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  onImageElementLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth = img.naturalWidth;
    this.naturalHeight = img.naturalHeight;

    if (this.naturalWidth <= 0 || this.naturalHeight <= 0) {
      this.cropError = this.translateService.instant('accreditations.photoCropDialog.errors.loadFailed');
      this.cdr.markForCheck();
      return;
    }

    const shortSide = Math.min(this.naturalWidth, this.naturalHeight);
    this.minScale = this.templateSize / shortSide;
    if (!isFinite(this.minScale) || this.minScale <= 0) {
      this.minScale = 1;
    }
    this.scale = this.minScale;
    this.offsetX = 0;
    this.offsetY = 0;
    this.clampOffsets();
    this.cdr.markForCheck();
  }

  zoomIn(): void {
    this.setScale(this.scale + this.scaleStep);
  }

  zoomOut(): void {
    this.setScale(this.scale - this.scaleStep);
  }

  onWheel(event: WheelEvent): void {
    const delta = event.deltaY;
    if (delta < 0) {
      this.setScale(this.scale + this.wheelScaleStep);
    } else if (delta > 0) {
      this.setScale(this.scale - this.wheelScaleStep);
    }
  }

  private setScale(newScale: number): void {
    if (!this.naturalWidth || !this.naturalHeight) return;
    const clamped = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    if (clamped === this.scale) return;
    this.scale = clamped;
    this.clampOffsets();
    this.cdr.markForCheck();
  }

  startPan(event: MouseEvent | TouchEvent): void {
    const { x, y } = this.getPointerPosition(event);
    this.isPanning = true;
    this.lastPointerX = x;
    this.lastPointerY = y;
  }

  onPanMove(event: MouseEvent | TouchEvent): void {
    if (!this.isPanning) return;
    const { x, y } = this.getPointerPosition(event);
    const dx = x - this.lastPointerX;
    const dy = y - this.lastPointerY;
    this.lastPointerX = x;
    this.lastPointerY = y;
    this.offsetX += dx;
    this.offsetY += dy;
    this.clampOffsets();
    this.cdr.markForCheck();
  }

  endPan(): void {
    this.isPanning = false;
  }

  private getPointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if (event instanceof MouseEvent) {
      return { x: event.clientX, y: event.clientY };
    }
    const touch = event.touches[0] ?? event.changedTouches[0];
    return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
  }

  private clampOffsets(): void {
    if (!this.naturalWidth || !this.naturalHeight) return;
    const displayW = this.naturalWidth * this.scale;
    const displayH = this.naturalHeight * this.scale;
    const T = this.templateSize;

    const maxOffsetX = Math.max(0, (displayW - T) / 2);
    const maxOffsetY = Math.max(0, (displayH - T) / 2);

    this.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offsetX));
    this.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offsetY));
  }

  onLoadImageFailed(): void {
    this.cropError = this.translateService.instant('accreditations.photoCropDialog.errors.loadFailed');
    this.cdr.markForCheck();
  }

  close(): void {
    this.closed.emit();
  }

  private cropVisibleToBlob(): Promise<Blob | null> {
    const img = this.cropImageRef?.nativeElement;
    if (!img || !this.naturalWidth || !this.naturalHeight) return Promise.resolve(null);

    const natW = this.naturalWidth;
    const natH = this.naturalHeight;
    const T = this.templateSize;
    const s = this.scale;

    const halfT = T / 2;
    let srcX = natW / 2 - (this.offsetX + halfT) / s;
    let srcY = natH / 2 - (this.offsetY + halfT) / s;
    let srcW = T / s;
    let srcH = T / s;

    srcX = Math.max(0, Math.min(natW - srcW, srcX));
    srcY = Math.max(0, Math.min(natH - srcH, srcY));
    srcW = Math.min(srcW, natW - srcX);
    srcH = Math.min(srcH, natH - srcY);

    const side = Math.min(srcW, srcH);
    srcW = side;
    srcH = side;

    const targetSize = Math.min(this.outputSize, Math.round(side));
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetSize, targetSize);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.96);
    });
  }

  async confirm(): Promise<void> {
    if (!this.previewUrl || !this.naturalWidth || !this.naturalHeight) {
      this.cropError = this.translateService.instant('accreditations.photoCropDialog.errors.notLoaded');
      this.cdr.markForCheck();
      return;
    }
    this.confirming = true;
    this.cropError = null;
    this.cdr.markForCheck();
    try {
      const blob = await this.cropVisibleToBlob();
      if (blob && blob.size > 0) {
        this.cropped.emit(blob);
        this.closed.emit();
      } else {
        this.cropError = this.translateService.instant('accreditations.photoCropDialog.errors.cropFailed');
      }
    } catch {
      this.cropError = this.translateService.instant('accreditations.photoCropDialog.errors.cropFailed');
    } finally {
      this.confirming = false;
      this.cdr.markForCheck();
    }
  }
}
