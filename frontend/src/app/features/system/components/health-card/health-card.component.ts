import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActuatorService, HealthResponse } from '../../services/actuator.service';

@Component({
  selector: 'app-health-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './health-card.component.html',
  styleUrl: './health-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  health: HealthResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private actuatorService: ActuatorService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.loadHealth();
  }

  private loadHealth(): void {
    this.actuatorService.getHealth().pipe(
      catchError(() => {
        this.error = this.translateService.instant('system.healthCard.errorLoading');
        this.loading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((response) => {
      if (response) {
        this.health = response;
        this.error = null;
      }
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  get overallStatus(): string {
    return this.health?.status || 'UNKNOWN';
  }

  get isUp(): boolean {
    return this.overallStatus === 'UP';
  }

  get components(): { name: string; status: string; details?: { [key: string]: any } }[] {
    if (!this.health?.components) return [];
    return Object.entries(this.health.components).map(([name, data]) => ({
      name,
      status: data.status,
      details: data.details,
    }));
  }

  getComponentIcon(status: string): string {
    return status === 'UP' ? 'text-green-500' : 'text-red-500';
  }

  getComponentLabel(name: string): string {
    const key = `system.healthCard.components.${name}`;
    const translated = this.translateService.instant(key);
    return translated !== key ? translated : name;
  }
}
