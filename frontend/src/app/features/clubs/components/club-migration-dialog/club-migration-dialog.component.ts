import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { ClubsService, ClubBatchCreateRequest, ClubBatchCreateRequestItem, ClubBatchCreateResponse } from '../../../../core/services/api';
import { takeUntil, Subject, forkJoin, of, catchError, delay, retryWhen, scan, map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';

const VALID_PREFIX_REGEX = /^\d{2}$/;
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

interface ColumnMapping {
  excelColumn: string;
  dataField: string;
}

interface MigrationResult {
  totalCreated: number;
  totalSkipped: number;
  failedChunkCount: number;
  totalChunkCount: number;
  skippedItems: Array<{ club: ClubBatchCreateRequestItem; reason: string }>;
  failedChunkErrors: Array<{ chunkIndex: number; message: string }>;
}

@Component({
  selector: 'app-club-migration-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './club-migration-dialog.component.html',
  styleUrl: './club-migration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubMigrationDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() migrated = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  file: File | null = null;
  fileName = '';
  excelColumns: string[] = [];
  previewData: any[] = [];

  columnMappings: ColumnMapping[] = [];

  parsedClubs: ClubBatchCreateRequestItem[] = [];

  readonly dataFields = [
    { value: '', label: 'Не импортирай' },
    { value: 'name', label: 'Пълно име' },
    { value: 'shortName', label: 'Кратко име' },
    { value: 'cardPrefix', label: 'Номер (2 цифри)' },
    { value: 'clubEmail', label: 'Имейл на клуб' },
    { value: 'adminEmail', label: 'Имейл на администратор' }
  ];

  getFieldOptionsForMapping(mapping: ColumnMapping): SearchableSelectOption[] {
    return this.dataFields.map(f => ({
      value: f.value,
      label: f.label,
      disabled: f.value !== '' && this.columnMappings.some(m => m !== mapping && m.dataField === f.value)
    }));
  }

  step: 'upload' | 'mapping' | 'preview' | 'results' = 'upload';
  migrating = false;
  error: string | null = null;
  migrationResult: MigrationResult | null = null;
  migrationProgress = '';

  constructor(
    private clubsService: ClubsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.reset();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private reset(): void {
    this.file = null;
    this.fileName = '';
    this.excelColumns = [];
    this.previewData = [];
    this.columnMappings = [];
    this.parsedClubs = [];
    this.step = 'upload';
    this.migrating = false;
    this.error = null;
    this.migrationResult = null;
    this.migrationProgress = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.fileName = this.file.name;
      this.parseFile();
    }
  }

  private parseFile(): void {
    if (!this.file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (jsonData.length > 0) {
          this.excelColumns = jsonData[0].map((col: any) => String(col));
          this.previewData = jsonData.slice(1, 6).map(row => {
            const obj: any = {};
            this.excelColumns.forEach((col, idx) => {
              obj[col] = row[idx] ?? '';
            });
            return obj;
          });

          this.columnMappings = this.excelColumns.map(col => ({
            excelColumn: col,
            dataField: ''
          }));

          this.step = 'mapping';
          this.cdr.markForCheck();
        }
      } catch (err) {
        this.error = 'Грешка при четене на файла';
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  private rowToClub(row: any[]): ClubBatchCreateRequestItem | null {
    const club: Partial<ClubBatchCreateRequestItem> = {};
    this.columnMappings.forEach((mapping, idx) => {
      if (mapping.dataField) {
        (club as Record<string, string>)[mapping.dataField] = String(row[idx] ?? '').trim();
      }
    });
    const prefix = club.cardPrefix ?? '';
    if (!VALID_PREFIX_REGEX.test(prefix)) {
      return null;
    }
    if (club.shortName && club.name && club.clubEmail && club.adminEmail) {
      return club as ClubBatchCreateRequestItem;
    }
    return null;
  }

  goToPreview(): void {
    if (!this.file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        const clubs: ClubBatchCreateRequestItem[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const club = this.rowToClub(row);
          if (club) {
            clubs.push(club);
          }
        }

        this.parsedClubs = clubs;
        this.step = 'preview';
        this.error = null;
        this.cdr.markForCheck();
      } catch (err) {
        this.error = 'Грешка при четене на файла';
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  goBackToMapping(): void {
    this.step = 'mapping';
    this.parsedClubs = [];
    this.cdr.markForCheck();
  }

  onMappingFieldChange(mapping: ColumnMapping, value: string | null): void {
    mapping.dataField = value ?? '';
    this.cdr.markForCheck();
  }

  get hasRequiredMappings(): boolean {
    const hasShortName = this.columnMappings.some(m => m.dataField === 'shortName');
    const hasName = this.columnMappings.some(m => m.dataField === 'name');
    const hasCardPrefix = this.columnMappings.some(m => m.dataField === 'cardPrefix');
    const hasClubEmail = this.columnMappings.some(m => m.dataField === 'clubEmail');
    const hasAdminEmail = this.columnMappings.some(m => m.dataField === 'adminEmail');
    return hasShortName && hasName && hasCardPrefix && hasClubEmail && hasAdminEmail;
  }

  private migrateChunkWithRetry(chunk: ClubBatchCreateRequestItem[]) {
    const request: ClubBatchCreateRequest = { clubs: chunk };
    return this.clubsService.migrateClubs(request).pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, error: HttpErrorResponse) => {
            if (error.status != null && error.status >= 400 && error.status < 500) {
              throw error;
            }
            if (retryCount >= MAX_RETRIES) {
              throw error;
            }
            return retryCount + 1;
          }, 0),
          delay(1000)
        )
      ),
      map((response): { success: true; response: ClubBatchCreateResponse } => ({ success: true, response })),
      catchError((err: unknown) => of({ success: false as const, error: err }))
    );
  }

  migrate(): void {
    if (this.parsedClubs.length === 0) {
      this.error = 'Няма валидни клубове за миграция (само редове с номер от 2 цифри).';
      this.cdr.markForCheck();
      return;
    }

    this.migrating = true;
    this.error = null;
    this.migrationResult = null;
    this.cdr.markForCheck();

    const chunks: ClubBatchCreateRequestItem[][] = [];
    for (let i = 0; i < this.parsedClubs.length; i += BATCH_SIZE) {
      chunks.push(this.parsedClubs.slice(i, i + BATCH_SIZE));
    }
    const totalChunks = chunks.length;

    this.migrationProgress = `Изпращане на ${this.parsedClubs.length} клуба в ${totalChunks} заявки...`;
    this.cdr.markForCheck();

    const requests = chunks.map((chunk) => this.migrateChunkWithRetry(chunk));

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Array<{ success: true; response: ClubBatchCreateResponse } | { success: false; error: unknown }>) => {
          this.migrating = false;
          this.migrationProgress = '';

          let totalCreated = 0;
          let totalSkipped = 0;
          const skippedItems: Array<{ club: ClubBatchCreateRequestItem; reason: string }> = [];
          const failedChunkErrors: Array<{ chunkIndex: number; message: string }> = [];

          results.forEach((r, index) => {
            if (r.success) {
              totalCreated += r.response.created?.length ?? 0;
              const skipped = r.response.skipped ?? [];
              totalSkipped += skipped.length;
              for (const s of skipped) {
                if (s.club != null && s.reason != null) {
                  skippedItems.push({ club: s.club, reason: s.reason });
                }
              }
            } else {
              const message = this.getErrorMessage(r.error);
              failedChunkErrors.push({ chunkIndex: index + 1, message });
            }
          });

          this.migrationResult = {
            totalCreated,
            totalSkipped,
            failedChunkCount: failedChunkErrors.length,
            totalChunkCount: totalChunks,
            skippedItems,
            failedChunkErrors
          };
          this.step = 'results';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.migrating = false;
          this.migrationProgress = '';
          this.error = err?.error?.message ?? 'Грешка при миграция';
          this.cdr.markForCheck();
        }
      });
  }

  private getErrorMessage(err: unknown): string {
    if (err == null) return 'Unknown error';
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && typeof (body as { message?: string }).message === 'string') {
        return (body as { message: string }).message;
      }
      if (err.message) return err.message;
      if (err.status && err.statusText) return `${err.status} ${err.statusText}`;
      return err.statusText || `HTTP ${err.status}`;
    }
    if (typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string } }).error;
      if (body && typeof body === 'object' && typeof (body as { message?: string }).message === 'string') {
        return (body as { message: string }).message;
      }
    }
    if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    return String(err);
  }

  finishResults(): void {
    if (this.migrationResult && this.migrationResult.totalCreated > 0) {
      this.migrated.emit();
    }
    this.closed.emit();
  }
}

