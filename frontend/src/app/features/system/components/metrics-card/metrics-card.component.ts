import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, takeUntil, catchError, of } from 'rxjs';
import { ActuatorService, MetricDetailResponse } from '../../services/actuator.service';

interface MetricGroup {
  title: string;
  metrics: { label: string; value: string; sublabel?: string }[];
}

@Component({
  selector: 'app-metrics-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-card.component.html',
  styleUrl: './metrics-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  groups: MetricGroup[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private actuatorService: ActuatorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.loadMetrics();
  }

  private loadMetrics(): void {
    forkJoin({
      heapUsed: this.actuatorService.getMetric('jvm.memory.used').pipe(catchError(() => of(null))),
      heapMax: this.actuatorService.getMetric('jvm.memory.max').pipe(catchError(() => of(null))),
      heapCommitted: this.actuatorService.getMetric('jvm.memory.committed').pipe(catchError(() => of(null))),
      httpRequests: this.actuatorService.getMetric('http.server.requests').pipe(catchError(() => of(null))),
      threads: this.actuatorService.getMetric('jvm.threads.live').pipe(catchError(() => of(null))),
      threadsPeak: this.actuatorService.getMetric('jvm.threads.peak').pipe(catchError(() => of(null))),
      threadsDaemon: this.actuatorService.getMetric('jvm.threads.daemon').pipe(catchError(() => of(null))),
      uptime: this.actuatorService.getMetric('process.uptime').pipe(catchError(() => of(null))),
      startTime: this.actuatorService.getMetric('process.start.time').pipe(catchError(() => of(null))),
      cpus: this.actuatorService.getMetric('system.cpu.count').pipe(catchError(() => of(null))),
      cpuUsage: this.actuatorService.getMetric('process.cpu.usage').pipe(catchError(() => of(null))),
      systemCpuUsage: this.actuatorService.getMetric('system.cpu.usage').pipe(catchError(() => of(null))),
      gcPauseCount: this.actuatorService.getMetric('jvm.gc.pause').pipe(catchError(() => of(null))),
      gcMemoryAllocated: this.actuatorService.getMetric('jvm.gc.memory.allocated').pipe(catchError(() => of(null))),
      hikariActive: this.actuatorService.getMetric('hikaricp.connections.active').pipe(catchError(() => of(null))),
      hikariIdle: this.actuatorService.getMetric('hikaricp.connections.idle').pipe(catchError(() => of(null))),
      hikariPending: this.actuatorService.getMetric('hikaricp.connections.pending').pipe(catchError(() => of(null))),
      hikariMax: this.actuatorService.getMetric('hikaricp.connections.max').pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.groups = this.buildGroups(r);
          this.loading = false;
          this.error = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Грешка при зареждане на метриките';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private buildGroups(r: Record<string, MetricDetailResponse | null>): MetricGroup[] {
    const groups: MetricGroup[] = [];

    // Server & Uptime
    const serverMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const uptime = this.val(r['uptime'], 'VALUE');
    if (uptime !== null) {
      serverMetrics.push({ label: 'Uptime', value: this.formatUptime(uptime) });
    }
    const startTime = this.val(r['startTime'], 'VALUE');
    if (startTime !== null) {
      serverMetrics.push({ label: 'Стартиран на', value: new Date(startTime * 1000).toLocaleString('bg-BG') });
    }
    const cpus = this.val(r['cpus'], 'VALUE');
    if (cpus !== null) {
      serverMetrics.push({ label: 'CPU ядра', value: `${cpus}` });
    }
    const cpuUsage = this.val(r['cpuUsage'], 'VALUE');
    const systemCpu = this.val(r['systemCpuUsage'], 'VALUE');
    if (cpuUsage !== null) {
      serverMetrics.push({ label: 'CPU (процес)', value: `${(cpuUsage * 100).toFixed(1)}%`, sublabel: systemCpu !== null ? `Система: ${(systemCpu * 100).toFixed(1)}%` : undefined });
    }
    if (serverMetrics.length) groups.push({ title: 'Сървър', metrics: serverMetrics });

    // JVM Memory
    const memMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const heapUsed = this.val(r['heapUsed'], 'VALUE');
    const heapMax = this.val(r['heapMax'], 'VALUE');
    const heapCommitted = this.val(r['heapCommitted'], 'VALUE');
    if (heapUsed !== null) {
      const usedMB = (heapUsed / 1024 / 1024).toFixed(1);
      const maxMB = heapMax ? (heapMax / 1024 / 1024).toFixed(0) : '?';
      const pct = heapMax ? `${((heapUsed / heapMax) * 100).toFixed(0)}%` : '';
      memMetrics.push({ label: 'Heap използвана', value: `${usedMB} MB / ${maxMB} MB`, sublabel: pct ? `${pct} използвана` : undefined });
    }
    if (heapCommitted !== null) {
      memMetrics.push({ label: 'Heap заделена', value: `${(heapCommitted / 1024 / 1024).toFixed(0)} MB` });
    }
    if (memMetrics.length) groups.push({ title: 'JVM памет', metrics: memMetrics });

    // GC
    const gcMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const gcCount = this.val(r['gcPauseCount'], 'COUNT');
    const gcTotalTime = this.val(r['gcPauseCount'], 'TOTAL_TIME');
    if (gcCount !== null) {
      gcMetrics.push({ label: 'GC паузи', value: `${gcCount}`, sublabel: gcTotalTime !== null ? `Общо време: ${(gcTotalTime * 1000).toFixed(0)} ms` : undefined });
    }
    const gcAllocated = this.val(r['gcMemoryAllocated'], 'COUNT');
    if (gcAllocated !== null) {
      gcMetrics.push({ label: 'GC памет алокирана', value: `${(gcAllocated / 1024 / 1024).toFixed(0)} MB` });
    }
    if (gcMetrics.length) groups.push({ title: 'Garbage Collector', metrics: gcMetrics });

    // Threads
    const threadMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const threadsLive = this.val(r['threads'], 'VALUE');
    const threadsPeak = this.val(r['threadsPeak'], 'VALUE');
    const threadsDaemon = this.val(r['threadsDaemon'], 'VALUE');
    if (threadsLive !== null) {
      threadMetrics.push({ label: 'Активни нишки', value: `${threadsLive}`, sublabel: threadsPeak !== null ? `Пик: ${threadsPeak}` : undefined });
    }
    if (threadsDaemon !== null) {
      threadMetrics.push({ label: 'Daemon нишки', value: `${threadsDaemon}` });
    }
    if (threadMetrics.length) groups.push({ title: 'Нишки', metrics: threadMetrics });

    // DB Pool
    const dbMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const active = this.val(r['hikariActive'], 'VALUE');
    const idle = this.val(r['hikariIdle'], 'VALUE');
    const pending = this.val(r['hikariPending'], 'VALUE');
    const max = this.val(r['hikariMax'], 'VALUE');
    if (active !== null) {
      dbMetrics.push({ label: 'Активни връзки', value: `${active}`, sublabel: max !== null ? `Макс: ${max}` : undefined });
    }
    if (idle !== null) {
      dbMetrics.push({ label: 'Idle връзки', value: `${idle}` });
    }
    if (pending !== null) {
      dbMetrics.push({ label: 'Чакащи', value: `${pending}` });
    }
    if (dbMetrics.length) groups.push({ title: 'DB Connection Pool', metrics: dbMetrics });

    // HTTP
    const httpMetrics: { label: string; value: string; sublabel?: string }[] = [];
    const totalReqs = this.val(r['httpRequests'], 'COUNT');
    const totalTime = this.val(r['httpRequests'], 'TOTAL_TIME');
    if (totalReqs !== null) {
      httpMetrics.push({ label: 'Общо заявки', value: `${totalReqs}` });
    }
    if (totalReqs !== null && totalTime !== null && totalReqs > 0) {
      httpMetrics.push({ label: 'Средно време', value: `${((totalTime / totalReqs) * 1000).toFixed(1)} ms` });
    }
    if (httpMetrics.length) groups.push({ title: 'HTTP заявки', metrics: httpMetrics });

    return groups;
  }

  private val(metric: MetricDetailResponse | null, stat: string): number | null {
    if (!metric?.measurements) return null;
    const m = metric.measurements.find(x => x.statistic === stat);
    return m?.value ?? null;
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}д`);
    if (h > 0) parts.push(`${h}ч`);
    parts.push(`${m}м`);
    return parts.join(' ');
  }
}
