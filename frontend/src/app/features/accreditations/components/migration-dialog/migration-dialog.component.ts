import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import {
  AccreditationsService,
  AthleteBatchMigrationRequest,
  AthleteBatchMigrationRequestItem,
  AthleteBatchMigrationResponse,
  Gender,
} from '../../../../core/services/api';
import { takeUntil, Subject, forkJoin, of, catchError, delay, retryWhen, scan, map, EMPTY } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';

const VALID_CARD_NUMBER_REGEX = /^[0-9]{4,6}$/;
const MAX_RETRIES = 3;
const BATCH_SIZE = 100;

interface FieldMapping {
  dataField: string;
  label: string;
  excelColumn: string;
  required: boolean;
}

interface MigrationResult {
  totalMigrated: number;
  totalSkipped: number;
  skippedItems: Array<{ athlete: AthleteBatchMigrationRequestItem; reason: string }>;
  failedChunkCount: number;
  totalChunkCount: number;
  failedChunkErrors: Array<{ chunkIndex: number; message: string }>;
}

@Component({
  selector: 'app-migration-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, TranslateModule],
  templateUrl: './migration-dialog.component.html',
  styleUrl: './migration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MigrationDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() migrated = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  file: File | null = null;
  fileName = '';
  excelColumns: string[] = [];
  fieldMappings: FieldMapping[] = [];

  parsedAthletes: AthleteBatchMigrationRequestItem[] = [];

  readonly dataFields = [
    { value: 'oldCardNumber', label: this.translateService.instant('accreditations.migrationDialog.dataFields.oldCardNumber') },
    { value: 'firstName', label: this.translateService.instant('accreditations.migrationDialog.dataFields.firstName') },
    { value: 'middleName', label: this.translateService.instant('accreditations.migrationDialog.dataFields.middleName') },
    { value: 'lastName', label: this.translateService.instant('accreditations.migrationDialog.dataFields.lastName') },
    { value: 'gender', label: this.translateService.instant('accreditations.migrationDialog.dataFields.gender') },
    { value: 'dateOfBirth', label: this.translateService.instant('accreditations.migrationDialog.dataFields.dateOfBirth') },
  ];

  private readonly requiredFields = ['oldCardNumber', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth'];

  migrationYear = new Date().getFullYear();
  maxYear = new Date().getFullYear();
  step: 'upload' | 'mapping' | 'preview' | 'results' = 'upload';
  migrating = false;
  error: string | null = null;
  migrationResult: MigrationResult | null = null;
  migrationProgress = '';

  constructor(
    private accreditationsService: AccreditationsService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
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
    this.fieldMappings = [];
    this.parsedAthletes = [];
    this.step = 'upload';
    this.migrating = false;
    this.error = null;
    this.migrationResult = null;
    this.migrationProgress = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
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
          this.excelColumns = jsonData[0].map((col: any) => String(col ?? ''));
          this.fieldMappings = this.dataFields.map(f => ({
            dataField: f.value,
            label: f.label,
            excelColumn: '',
            required: this.requiredFields.includes(f.value),
          }));
          this.step = 'mapping';
          this.error = null;
          this.cdr.markForCheck();
        }
      } catch {
        this.error = this.translateService.instant('accreditations.migrationDialog.fileReadError');
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  getExcelOptionsForField(field: FieldMapping): SearchableSelectOption[] {
    return [
      { value: '', label: this.translateService.instant('accreditations.migrationDialog.mapping.placeholder') },
      ...this.excelColumns.map(col => ({
        value: col,
        label: col,
        disabled: this.fieldMappings.some(f => f !== field && f.excelColumn === col),
      })),
    ];
  }

  onFieldExcelColumnChange(field: FieldMapping, value: string | null): void {
    field.excelColumn = value ?? '';
    this.cdr.markForCheck();
  }

  get hasRequiredMappings(): boolean {
    return this.fieldMappings
      .filter(f => f.required)
      .every(f => f.excelColumn !== '');
  }

  private excelSerialToDate(serial: number): string | null {
    if (serial < 1 || !Number.isFinite(serial)) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeGender(raw: string): 'MALE' | 'FEMALE' | null {
    const s = raw.trim().toLowerCase();
    if (s === 'male' || s === 'мъж' || s === 'm') return Gender.MALE;
    if (s === 'female' || s === 'жена' || s === 'f' || s === 'ж') return Gender.FEMALE;
    return null;
  }

  genderLabel(gender: string): string {
    if (gender === Gender.MALE) return this.translateService.instant('accreditations.gender.male');
    if (gender === Gender.FEMALE) return this.translateService.instant('accreditations.gender.female');
    return gender ?? '';
  }

  private normalizeDateOfBirth(value: string | number): string | null {
    const s = String(value ?? '').trim();
    if (!s) return null;
    const num = Number(s);
    if (Number.isFinite(num) && num > 0) {
      const fromExcel = this.excelSerialToDate(num);
      if (fromExcel) return fromExcel;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  }

  private rowToAthlete(row: any[]): AthleteBatchMigrationRequestItem | null {
    const get = (field: string): string => {
      const f = this.fieldMappings.find(x => x.dataField === field);
      if (!f || !f.excelColumn) return '';
      const idx = this.excelColumns.indexOf(f.excelColumn);
      if (idx < 0) return '';
      return String(row[idx] ?? '').trim();
    };
    const oldCardNumber = get('oldCardNumber');
    if (!VALID_CARD_NUMBER_REGEX.test(oldCardNumber)) return null;
    const firstName = get('firstName');
    const middleName = get('middleName');
    const lastName = get('lastName');
    const genderNorm = this.normalizeGender(get('gender'));
    if (!firstName || !middleName || !lastName || !genderNorm) return null;
    const dateVal = get('dateOfBirth');
    const dateOfBirth = this.normalizeDateOfBirth(dateVal) ?? this.normalizeDateOfBirth(Number(dateVal));
    if (!dateOfBirth) return null;
    return {
      oldCardNumber,
      firstName,
      middleName,
      lastName,
      gender: genderNorm,
      dateOfBirth,
    };
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
        const athletes: AthleteBatchMigrationRequestItem[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const item = this.rowToAthlete(jsonData[i]);
          if (item) athletes.push(item);
        }
        this.parsedAthletes = athletes;
        this.step = 'preview';
        this.error = null;
        this.cdr.markForCheck();
      } catch {
        this.error = this.translateService.instant('accreditations.migrationDialog.fileReadError');
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  goBackToMapping(): void {
    this.step = 'mapping';
    this.parsedAthletes = [];
    this.cdr.markForCheck();
  }

  private migrateChunkWithRetry(chunk: AthleteBatchMigrationRequestItem[]) {
    const request: AthleteBatchMigrationRequest = { year: this.migrationYear, athletes: chunk };
    return this.accreditationsService.batchMigrateAthletes(request).pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, err: HttpErrorResponse) => {
            if (err.status != null && err.status >= 400 && err.status < 500) throw err;
            if (retryCount >= MAX_RETRIES) throw err;
            return retryCount + 1;
          }, 0),
          delay(1000),
        ),
      ),
      map((r): { success: true; response: AthleteBatchMigrationResponse } => ({ success: true, response: r })),
      catchError((err: unknown) => of({ success: false as const, error: err })),
    );
  }

  migrate(): void {
    if (this.parsedAthletes.length === 0) {
      this.error = this.translateService.instant('accreditations.migrationDialog.noValidRecords');
      this.cdr.markForCheck();
      return;
    }
    this.migrating = true;
    this.error = null;
    this.migrationResult = null;
    const chunks: AthleteBatchMigrationRequestItem[][] = [];
    for (let i = 0; i < this.parsedAthletes.length; i += BATCH_SIZE) {
      chunks.push(this.parsedAthletes.slice(i, i + BATCH_SIZE));
    }
    const totalChunks = chunks.length;
    this.migrationProgress = this.translateService.instant('accreditations.migrationDialog.progress', { count: this.parsedAthletes.length, chunks: totalChunks });
    this.cdr.markForCheck();

    const requests = chunks.map((chunk) => this.migrateChunkWithRetry(chunk));

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Array<{ success: true; response: AthleteBatchMigrationResponse } | { success: false; error: unknown }>) => {
          this.migrating = false;
          this.migrationProgress = '';
          let totalMigrated = 0;
          let totalSkipped = 0;
          const skippedItems: Array<{ athlete: AthleteBatchMigrationRequestItem; reason: string }> = [];
          const failedChunkErrors: Array<{ chunkIndex: number; message: string }> = [];
          results.forEach((r, index) => {
            if (r.success) {
              totalMigrated += r.response.migrated?.length ?? 0;
              (r.response.skipped ?? []).forEach((s) => {
                if (s.athlete != null && s.reason != null)
                  skippedItems.push({ athlete: s.athlete, reason: s.reason });
              });
              totalSkipped += r.response.skipped?.length ?? 0;
            } else {
              failedChunkErrors.push({ chunkIndex: index + 1, message: this.getErrorMessage(r.error) });
            }
          });
          this.migrationResult = {
            totalMigrated,
            totalSkipped,
            skippedItems,
            failedChunkCount: failedChunkErrors.length,
            totalChunkCount: totalChunks,
            failedChunkErrors,
          };
          this.step = 'results';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.migrating = false;
          this.migrationProgress = '';
          this.error = this.getErrorMessage(err);
          this.cdr.markForCheck();
        },
      });
  }

  private getErrorMessage(err: unknown): string {
    if (err == null) return 'Unknown error';
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && typeof (body as { message?: string }).message === 'string')
        return (body as { message: string }).message;
      if (err.message) return err.message;
      if (err.status && err.statusText) return `${err.status} ${err.statusText}`;
      return err.statusText || `HTTP ${err.status}`;
    }
    if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
      return (err as { message: string }).message;
    return String(err);
  }

  finishResults(): void {
    if (this.migrationResult && this.migrationResult.totalMigrated > 0) {
      this.migrated.emit();
    }
    this.closed.emit();
  }
}
