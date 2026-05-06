import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AccreditationsService } from '../../../../core/services/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface RenewalResult {
  athleteId: string;
  success: boolean;
  error?: string;
  athleteName?: string;
}

@Component({
  selector: 'app-renew-accreditation-dialog',
  standalone: true,
  imports: [CommonModule, DialogComponent, ButtonComponent, TranslateModule],
  templateUrl: './renew-accreditation-dialog.component.html',
  styleUrl: './renew-accreditation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RenewAccreditationDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() athleteIds: string[] = [];
  @Input() athletes: Array<{ id: string; name: string; dateOfBirth?: string }> = [];

  @Output() closed = new EventEmitter<void>();
  @Output() renewed = new EventEmitter<void>();

  loading = false;
  results: RenewalResult[] = [];
  showResults = false;
  athleteNames: Map<string, string> = new Map();
  isConfirmDialogOpen = false;

  constructor(
    private accreditationsService: AccreditationsService,
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.results = [];
      this.showResults = false;
      this.loading = false;
      this.athleteNames.clear();
      this.isConfirmDialogOpen = false;
    }
    if (changes['athletes'] && this.athletes) {
      this.athleteNames.clear();
      this.athletes.forEach(athlete => {
        if (athlete.id && athlete.name) {
          this.athleteNames.set(athlete.id, athlete.name);
        }
      });
    }
    if (changes['athleteIds'] || changes['athletes']) {
      this.cdr.markForCheck();
    }
  }

  get athleteCount(): number {
    return this.athleteIds.length;
  }

  close(): void {
    this.results = [];
    this.showResults = false;
    this.closed.emit();
  }

  renew(): void {
    if (this.athleteIds.length === 0) {
      return;
    }

    this.isConfirmDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirmDialog(): void {
    this.isConfirmDialogOpen = false;
    this.cdr.markForCheck();
  }

  confirmRenew(): void {
    this.isConfirmDialogOpen = false;
    this.loading = true;
    this.cdr.markForCheck();

    const uniqueAthleteIds = Array.from(new Set(this.athleteIds));
    
    const request = { athleteIds: uniqueAthleteIds };
    
    const batchRenewMethod = (this.accreditationsService as any).batchRenewAccreditations;
    const apiCall = batchRenewMethod && typeof batchRenewMethod === 'function'
      ? batchRenewMethod.call(this.accreditationsService, request)
      : this.makeDirectHttpCall(request);
    
    apiCall.pipe(
      catchError(err => {
        console.error('[RenewDialog] Error during batch renewal:', err);
        this.loading = false;
        this.results = uniqueAthleteIds.map(athleteId => ({
          athleteId,
          success: false,
          error: err?.error?.message || err?.message || this.translateService.instant('accreditations.renewDialog.errors.renewFailed')
        }));
        this.showResults = true;
        this.cdr.markForCheck();
        return of({ renewed: [], failed: [] });
      })
    ).subscribe({
      next: (response: any) => {
        
        const renewedMap = new Map<string, boolean>();
        if (response?.renewed) {
          response.renewed.forEach((accreditation: any) => {
            if (accreditation.athleteId) {
              renewedMap.set(accreditation.athleteId, true);
              if (accreditation.athlete) {
                const name = `${accreditation.athlete.firstName || ''} ${accreditation.athlete.middleName || ''} ${accreditation.athlete.lastName || ''}`.trim();
                if (name) {
                  this.athleteNames.set(accreditation.athleteId, name);
                }
              }
            }
          });
        }
        
        const failedMap = new Map<string, string>();
        if (response?.failed) {
          response.failed.forEach((failed: any) => {
            if (failed.athleteId) {
              failedMap.set(failed.athleteId, failed.error || this.translateService.instant('accreditations.renewDialog.results.renewError'));
              if (failed.athleteName) {
                this.athleteNames.set(failed.athleteId, failed.athleteName);
              }
            }
          });
        }
        
        this.results = uniqueAthleteIds.map(athleteId => {
          if (renewedMap.has(athleteId)) {
            return {
              athleteId,
              success: true,
              athleteName: this.athleteNames.get(athleteId) || athleteId
            };
          } else if (failedMap.has(athleteId)) {
            return {
              athleteId,
              success: false,
              error: failedMap.get(athleteId) || this.translateService.instant('accreditations.renewDialog.errors.renewFailed'),
              athleteName: this.athleteNames.get(athleteId) || athleteId
            };
          } else {
            return {
              athleteId,
              success: false,
              error: this.translateService.instant('accreditations.renewDialog.errors.unknown'),
              athleteName: athleteId
            };
          }
        });
        
        this.loading = false;
        this.showResults = true;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('[RenewDialog] Subscribe error:', err);
        this.loading = false;
        this.results = uniqueAthleteIds.map(athleteId => ({
          athleteId,
          success: false,
          error: err?.error?.message || err?.message || this.translateService.instant('accreditations.renewDialog.errors.renewFailed')
        }));
        this.showResults = true;
        this.cdr.markForCheck();
      }
    });
  }

  private makeDirectHttpCall(request: { athleteIds: string[] }): any {
    const basePath = (this.accreditationsService as any).configuration?.basePath || 'http://localhost:8080';
    const url = `${basePath}/accreditations/renew/batch`;
    
    const serviceHeaders = (this.accreditationsService as any).defaultHeaders;
    let headers = new HttpHeaders();
    if (serviceHeaders) {
      serviceHeaders.keys().forEach((key: string) => {
        const values = serviceHeaders.getAll(key);
        if (values) {
          values.forEach((value: string) => {
            headers = headers.append(key, value);
          });
        }
      });
    }
    
    const token = localStorage.getItem('access_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    headers = headers.set('Content-Type', 'application/json');
    
    return this.httpClient.post(url, request, {
      headers: headers,
      withCredentials: (this.accreditationsService as any).configuration?.withCredentials || false
    });
  }

  getAthleteName(athleteId: string): string {
    return this.athleteNames.get(athleteId) || athleteId;
  }

  finishAndClose(): void {
    const hasSuccesses = this.results.some(r => r.success);
    if (hasSuccesses) {
      this.renewed.emit();
    } else {
      this.close();
    }
  }

  get successCount(): number {
    return this.results.filter(r => r.success).length;
  }

  get failCount(): number {
    return this.results.filter(r => !r.success).length;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('bg-BG', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch {
      return dateString;
    }
  }
}

