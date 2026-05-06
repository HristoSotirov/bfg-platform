import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActuatorService, LoggersResponse } from '../../services/actuator.service';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';

interface LoggerDisplay {
  name: string;
  label: string;
  configuredLevel: string | null;
  effectiveLevel: string;
}

@Component({
  selector: 'app-loggers-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SearchableSelectDropdownComponent],
  templateUrl: './loggers-card.component.html',
  styleUrl: './loggers-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoggersCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loggers: LoggerDisplay[] = [];
  levels: string[] = ['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  levelOptions: SearchableSelectOption[] = [
    { value: 'OFF', label: 'OFF' },
    { value: 'ERROR', label: 'ERROR' },
    { value: 'WARN', label: 'WARN' },
    { value: 'INFO', label: 'INFO' },
    { value: 'DEBUG', label: 'DEBUG' },
    { value: 'TRACE', label: 'TRACE' },
  ];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  private readonly importantLoggers = [
    'ROOT',
    'com.bfg.platform',
    'org.springframework',
    'org.hibernate',
    'org.springframework.web',
    'org.springframework.security',
  ];

  constructor(
    private actuatorService: ActuatorService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadLoggers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLoggers(): void {
    this.actuatorService
      .getLoggers()
      .pipe(
        catchError(() => {
          this.error = this.translateService.instant('system.loggersCard.errorLoading');
          this.loading = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((response) => {
        if (response) {
          this.loggers = this.extractLoggers(response);
          this.error = null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private extractLoggers(response: LoggersResponse): LoggerDisplay[] {
    const result: LoggerDisplay[] = [];

    for (const loggerName of this.importantLoggers) {
      const data = response.loggers[loggerName];
      if (data) {
        result.push({
          name: loggerName,
          label: this.getLoggerLabel(loggerName),
          configuredLevel: data.configuredLevel,
          effectiveLevel: data.effectiveLevel,
        });
      }
    }

    return result;
  }

  private getLoggerLabel(name: string): string {
    const labels: { [key: string]: string } = {
      ROOT: 'Root',
      'com.bfg.platform': 'BFG Platform',
      'org.springframework': 'Spring Framework',
      'org.hibernate': 'Hibernate',
      'org.springframework.web': 'Spring Web',
      'org.springframework.security': 'Spring Security',
    };
    return labels[name] || name;
  }

  onLevelChange(logger: LoggerDisplay, newLevel: string): void {
    this.successMessage = null;

    this.actuatorService
      .setLoggerLevel(logger.name, newLevel)
      .pipe(
        catchError(() => {
          this.error = this.translateService.instant('system.loggersCard.levelChangeError', { logger: logger.label });
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (result !== null || result === undefined) {
          logger.configuredLevel = newLevel;
          logger.effectiveLevel = newLevel;
          this.successMessage = this.translateService.instant('system.loggersCard.levelChanged', { logger: logger.label, level: newLevel });
          this.error = null;

          setTimeout(() => {
            this.successMessage = null;
            this.cdr.markForCheck();
          }, 3000);
        }
        this.cdr.markForCheck();
      });
  }

  getEffectiveLevel(logger: LoggerDisplay): string {
    return logger.configuredLevel || logger.effectiveLevel;
  }
}
