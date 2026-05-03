import {
  Component,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { ActuatorService } from '../../services/actuator.service';

interface ThreadInfo {
  threadName: string;
  threadId: number;
  threadState: string;
  stackTrace: { className: string; methodName: string; fileName: string; lineNumber: number }[];
  expanded?: boolean;
}

interface ThreadGroup {
  state: string;
  threads: ThreadInfo[];
  expanded: boolean;
}

@Component({
  selector: 'app-thread-dump-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread-dump-card.component.html',
  styleUrl: './thread-dump-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadDumpCardComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  threadGroups: ThreadGroup[] = [];
  totalThreads = 0;
  stateCounts: { state: string; count: number }[] = [];
  loading = false;
  loaded = false;
  error: string | null = null;

  constructor(
    private actuatorService: ActuatorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.loadThreadDump();
  }

  refresh(): void {
    this.load();
  }

  private loadThreadDump(): void {
    this.actuatorService.getThreadDump().pipe(
      catchError(() => {
        this.error = 'Грешка при зареждане на thread dump';
        this.loading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((response) => {
      if (response) {
        this.processThreads(response.threads);
        this.error = null;
        this.loaded = true;
      }
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  private processThreads(threads: any[]): void {
    this.totalThreads = threads.length;

    // Count by state
    const counts: { [state: string]: number } = {};
    const grouped: { [state: string]: ThreadInfo[] } = {};

    const stateOrder = ['RUNNABLE', 'WAITING', 'TIMED_WAITING', 'BLOCKED'];

    for (const t of threads) {
      const state = t.threadState || 'UNKNOWN';
      counts[state] = (counts[state] || 0) + 1;
      if (!grouped[state]) grouped[state] = [];
      grouped[state].push({
        threadName: t.threadName,
        threadId: t.threadId,
        threadState: state,
        stackTrace: t.stackTrace || [],
        expanded: false,
      });
    }

    this.stateCounts = stateOrder
      .filter(s => counts[s])
      .map(s => ({ state: s, count: counts[s] }));

    // Add any states not in the predefined order
    for (const s of Object.keys(counts)) {
      if (!stateOrder.includes(s)) {
        this.stateCounts.push({ state: s, count: counts[s] });
      }
    }

    this.threadGroups = this.stateCounts.map(sc => ({
      state: sc.state,
      threads: grouped[sc.state] || [],
      expanded: false,
    }));
  }

  toggleGroup(group: ThreadGroup): void {
    group.expanded = !group.expanded;
    this.cdr.markForCheck();
  }

  toggleThread(thread: ThreadInfo): void {
    thread.expanded = !thread.expanded;
    this.cdr.markForCheck();
  }

  getStateBadgeClass(state: string): string {
    switch (state) {
      case 'RUNNABLE':
        return 'bg-green-100 text-green-700';
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-700';
      case 'TIMED_WAITING':
        return 'bg-blue-100 text-blue-700';
      case 'BLOCKED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStackTraceLines(thread: ThreadInfo): string[] {
    return thread.stackTrace.slice(0, 10).map(
      frame => `at ${frame.className}.${frame.methodName}(${frame.fileName}:${frame.lineNumber})`
    );
  }
}
