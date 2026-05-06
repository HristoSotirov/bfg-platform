import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

export type ChronoPhase = 'waiting' | 'running' | 'stopped';
export type ChronoDialogMode = 'start' | 'finish' | 'assign';

export interface ChronoState {
  eventUuid: string;
  phase: ChronoPhase;
  startedAt: number | null;
  stoppedAt: number | null;
  elapsedMs: number;
  splits: number[];
}

export interface ChronoResult {
  eventUuid: string;
  laneResults: { lane: number; finishTimeMs: number }[];
}

const MAX_DURATION_MS = 20 * 60 * 1000;

@Component({
  selector: 'app-race-chronometer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogComponent, ButtonComponent],
  templateUrl: './race-chronometer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceChronometerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() initialMode: 'start' | 'finish' = 'start';
  @Input() eventLabel = '';
  @Input() chronoState!: ChronoState;
  @Input() lanes: number[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() chronoStarted = new EventEmitter<void>();
  @Output() resultsApplied = new EventEmitter<ChronoResult>();

  dialogMode: ChronoDialogMode = 'start';
  displayTime = '00:00.00';

  splitSelected: boolean[] = [];
  laneOrderInput = '';
  assignError: string | null = null;

  get selectedSplitCount(): number {
    return this.splitSelected.filter(Boolean).length;
  }

  get selectedSplits(): { index: number; ms: number }[] {
    return this.splitSelected
      .map((sel, i) => sel ? { index: i, ms: this.chronoState?.splits[i] ?? 0 } : null)
      .filter((v): v is { index: number; ms: number } => v !== null);
  }

  get minSplitsToStop(): number {
    return Math.ceil(this.lanes.length / 2);
  }

  get canStop(): boolean {
    return (this.chronoState?.splits?.length ?? 0) >= this.minSplitsToStop;
  }

  private animFrameId: number | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.dialogMode = this.initialMode;
        this.assignError = null;
        this.laneOrderInput = '';
        if (this.chronoState?.phase === 'running') {
          this.startTimerLoop();
        } else {
          this.updateDisplay();
        }
      } else {
        this.stopTimerLoop();
      }
    }
    if (changes['initialMode'] && this.isOpen) {
      this.dialogMode = this.initialMode;
      this.assignError = null;
      if (this.chronoState?.phase === 'running') {
        this.startTimerLoop();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTimerLoop();
  }

  get dialogTitle(): string {
    switch (this.dialogMode) {
      case 'start':
        return this.translate.instant('competitions.chronometer.titlePrefix.start') + ' ' + this.eventLabel;
      case 'finish':
        return this.translate.instant('competitions.chronometer.titlePrefix.finish') + ' ' + this.eventLabel;
      case 'assign':
        return this.translate.instant('competitions.chronometer.titlePrefix.assign') + ' ' + this.eventLabel;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen || event.code !== 'Space' || this.dialogMode === 'assign') return;
    event.preventDefault();

    if (this.dialogMode === 'start' && this.chronoState?.phase === 'waiting') {
      this.startChrono();
    } else if (this.dialogMode === 'finish' && this.chronoState?.phase === 'running') {
      this.captureSplit();
    }
  }

  startChrono(): void {
    if (!this.chronoState) return;
    this.chronoState.phase = 'running';
    this.chronoState.startedAt = performance.now();
    this.chronoState.elapsedMs = 0;
    this.chronoState.splits = [];
    this.chronoStarted.emit();
    this.startTimerLoop();
  }

  captureSplit(): void {
    if (!this.chronoState || this.chronoState.phase !== 'running') return;
    this.chronoState.splits.push(this.chronoState.elapsedMs);
    this.cdr.markForCheck();
  }

  stopChrono(): void {
    if (!this.chronoState || this.chronoState.phase !== 'running') return;
    this.chronoState.phase = 'stopped';
    this.chronoState.stoppedAt = performance.now();
    this.stopTimerLoop();
    this.updateDisplay();

    const splitsCount = this.chronoState.splits.length;
    const defaultCount = Math.min(splitsCount, this.lanes.length);
    this.splitSelected = this.chronoState.splits.map((_, i) => i < defaultCount);
    this.laneOrderInput = '';
    this.assignError = null;
    this.dialogMode = 'assign';
    this.cdr.markForCheck();
  }

  goBackToResults(): void {
    this.stopTimerLoop();
    this.closed.emit();
  }

  showRestartConfirm = false;

  promptRestart(): void {
    this.showRestartConfirm = true;
    this.cdr.markForCheck();
  }

  cancelRestart(): void {
    this.showRestartConfirm = false;
    this.cdr.markForCheck();
  }

  confirmRestart(): void {
    this.showRestartConfirm = false;
    this.stopTimerLoop();
    if (this.chronoState) {
      this.chronoState.phase = 'waiting';
      this.chronoState.startedAt = null;
      this.chronoState.stoppedAt = null;
      this.chronoState.elapsedMs = 0;
      this.chronoState.splits = [];
    }
    this.splitSelected = [];
    this.laneOrderInput = '';
    this.assignError = null;
    this.displayTime = '00:00.00';
    this.dialogMode = 'start';
    this.cdr.markForCheck();
  }

  toggleSplit(index: number): void {
    if (index < 0 || index >= this.splitSelected.length) return;
    const wouldBeSelected = !this.splitSelected[index];
    if (wouldBeSelected && this.selectedSplitCount >= this.lanes.length) {
      this.assignError = this.translate.instant('competitions.chronometer.assign.errors.maxSplits', { max: this.lanes.length });
      this.cdr.markForCheck();
      return;
    }
    this.splitSelected[index] = wouldBeSelected;
    this.assignError = null;
    this.cdr.markForCheck();
  }

  confirmAssign(): void {
    if (!this.chronoState) return;

    const selected = this.selectedSplits;
    if (selected.length === 0) {
      this.assignError = this.translate.instant('competitions.chronometer.assign.errors.selectAtLeastOne');
      return;
    }

    const trimmed = this.laneOrderInput.trim();
    if (!trimmed) {
      this.assignError = this.translate.instant('competitions.chronometer.assign.errors.enterLanes');
      return;
    }

    const parts = trimmed.split(/[\s,]+/);
    if (parts.length !== selected.length) {
      this.assignError = this.translate.instant('competitions.chronometer.assign.errors.exactLanes', { expected: selected.length, entered: parts.length });
      return;
    }

    const laneNumbers: number[] = [];
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (isNaN(n)) {
        this.assignError = this.translate.instant('competitions.chronometer.assign.errors.invalidLane', { value: p });
        return;
      }
      if (!this.lanes.includes(n)) {
        this.assignError = this.translate.instant('competitions.chronometer.assign.errors.laneNotExist', { lane: n, available: this.lanes.join(', ') });
        return;
      }
      if (laneNumbers.includes(n)) {
        this.assignError = this.translate.instant('competitions.chronometer.assign.errors.duplicateLane', { lane: n });
        return;
      }
      laneNumbers.push(n);
    }

    this.assignError = null;

    const result: ChronoResult = {
      eventUuid: this.chronoState.eventUuid,
      laneResults: laneNumbers.map((lane, i) => ({
        lane,
        finishTimeMs: Math.round(selected[i].ms),
      })),
    };

    this.resultsApplied.emit(result);
  }

  formatMs(ms: number): string {
    const capped = Math.min(ms, MAX_DURATION_MS);
    const totalCentiseconds = Math.floor(capped / 10);
    const centiseconds = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  private startTimerLoop(): void {
    this.stopTimerLoop();
    const tick = () => {
      if (!this.chronoState || this.chronoState.phase !== 'running' || this.chronoState.startedAt === null) return;

      const elapsed = performance.now() - this.chronoState.startedAt;

      if (elapsed >= MAX_DURATION_MS) {
        this.chronoState.phase = 'stopped';
        this.chronoState.stoppedAt = this.chronoState.startedAt + MAX_DURATION_MS;
        this.chronoState.elapsedMs = MAX_DURATION_MS;
        this.updateDisplay();
        this.cdr.detectChanges();
        return;
      }

      this.chronoState.elapsedMs = elapsed;
      this.displayTime = this.formatMs(elapsed);
      this.cdr.detectChanges();
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.ngZone.runOutsideAngular(() => {
      this.animFrameId = requestAnimationFrame(tick);
    });
  }

  private stopTimerLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateDisplay(): void {
    this.displayTime = this.formatMs(this.chronoState?.elapsedMs ?? 0);
  }
}
