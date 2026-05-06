import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { HealthCardComponent } from '../../components/health-card/health-card.component';
import { MetricsCardComponent } from '../../components/metrics-card/metrics-card.component';
import { LoggersCardComponent } from '../../components/loggers-card/loggers-card.component';
import { ThreadDumpCardComponent } from '../../components/thread-dump-card/thread-dump-card.component';
import { ActuatorService, InfoResponse } from '../../services/actuator.service';

@Component({
  selector: 'app-system-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    HealthCardComponent,
    MetricsCardComponent,
    LoggersCardComponent,
    ThreadDumpCardComponent,
  ],
  templateUrl: './system-dashboard-page.component.html',
  styleUrl: './system-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDashboardPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  info: InfoResponse | null = null;
  infoLoading = true;

  constructor(
    private actuatorService: ActuatorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInfo(): void {
    this.actuatorService
      .getInfo()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe((response) => {
        this.info = response;
        this.infoLoading = false;
        this.cdr.markForCheck();
      });
  }

  get appName(): string {
    return this.info?.build?.name || this.info?.app?.name || 'BFG Platform';
  }

  get appVersion(): string {
    return this.info?.build?.version || this.info?.app?.version || '-';
  }

  get buildTime(): string {
    const time = this.info?.build?.time;
    if (!time) return '-';
    try {
      const date = new Date(time);
      return date.toLocaleString('bg-BG');
    } catch {
      return time;
    }
  }
}
