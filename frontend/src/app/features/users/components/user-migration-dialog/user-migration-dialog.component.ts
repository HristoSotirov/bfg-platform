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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import {
  UsersService,
  UserBatchMigrationRequest,
  UserBatchMigrationRequestItem,
  UserBatchMigrationResponse,
  SystemRole,
} from '../../../../core/services/api';
import { takeUntil, Subject, forkJoin, of, catchError, delay, retryWhen, scan, map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

interface FieldMapping {
  dataField: string;
  label: string;
  excelColumn: string;
  required: boolean;
}

interface MigrationResult {
  totalCreated: number;
  totalSkipped: number;
  skippedItems: Array<{ user: UserBatchMigrationRequestItem; reason: string }>;
  failedChunkCount: number;
  totalChunkCount: number;
  failedChunkErrors: Array<{ chunkIndex: number; message: string }>;
}

@Component({
  selector: 'app-user-migration-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './user-migration-dialog.component.html',
  styleUrl: './user-migration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMigrationDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() migrated = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  file: File | null = null;
  fileName = '';
  excelColumns: string[] = [];
  fieldMappings: FieldMapping[] = [];

  parsedUsers: UserBatchMigrationRequestItem[] = [];

  readonly dataFields: { value: string; label: string }[] = [];

  private readonly requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'email', 'role'];

  roleOptions: SearchableSelectOption[] = [];

  defaultRole: SystemRole | '' = '';

  step: 'upload' | 'mapping' | 'preview' | 'results' = 'upload';
  migrating = false;
  error: string | null = null;
  migrationResult: MigrationResult | null = null;
  migrationProgress = '';

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {
    this.dataFields = [
      { value: 'firstName', label: this.translateService.instant('users.migration.fields.firstName') },
      { value: 'lastName', label: this.translateService.instant('users.migration.fields.lastName') },
      { value: 'dateOfBirth', label: this.translateService.instant('users.migration.fields.dateOfBirth') },
      { value: 'email', label: this.translateService.instant('users.migration.fields.email') },
      { value: 'role', label: this.translateService.instant('users.migration.fields.role') },
    ];
    this.roleOptions = [
      { value: '', label: this.translateService.instant('users.migration.defaultRolePlaceholder') },
      { value: SystemRole.FederationAdmin, label: this.translateService.instant('common.roles.FEDERATION_ADMIN') },
      { value: SystemRole.ClubAdmin, label: this.translateService.instant('common.roles.CLUB_ADMIN') },
      { value: SystemRole.Coach, label: this.translateService.instant('common.roles.COACH') },
      { value: SystemRole.Umpire, label: this.translateService.instant('common.roles.UMPIRE') },
    ];
  }

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
    this.parsedUsers = [];
    this.step = 'upload';
    this.migrating = false;
    this.error = null;
    this.migrationResult = null;
    this.migrationProgress = '';
    this.defaultRole = '';
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
        this.error = this.translateService.instant('users.migration.fileReadError');
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  getExcelOptionsForField(field: FieldMapping): SearchableSelectOption[] {
    return [
      { value: '', label: this.translateService.instant('users.migration.doNotImport') },
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
    const roleField = this.fieldMappings.find(f => f.dataField === 'role');
    const roleMapped = roleField?.excelColumn !== '';
    const roleHasDefault = this.defaultRole !== '';

    return this.fieldMappings
      .filter(f => f.required && f.dataField !== 'role')
      .every(f => f.excelColumn !== '') && (roleMapped || roleHasDefault);
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

  private normalizeRole(raw: string): SystemRole | null {
    const s = raw.trim().toUpperCase();
    if (s === 'FEDERATION_ADMIN' || s === 'АДМИНИСТРАТОР НА ФЕДЕРАЦИЯТА') return SystemRole.FederationAdmin;
    if (s === 'CLUB_ADMIN' || s === 'АДМИНИСТРАТОР НА КЛУБ') return SystemRole.ClubAdmin;
    if (s === 'COACH' || s === 'ТРЕНЬОР') return SystemRole.Coach;
    if (s === 'UMPIRE' || s === 'СЪДИЯ') return SystemRole.Umpire;
    return null;
  }

  roleLabel(role: string): string {
    const roleKeys: Record<string, string> = {
      [SystemRole.AppAdmin]: 'common.roles.APP_ADMIN',
      [SystemRole.FederationAdmin]: 'common.roles.FEDERATION_ADMIN',
      [SystemRole.ClubAdmin]: 'common.roles.CLUB_ADMIN',
      [SystemRole.Coach]: 'common.roles.COACH',
      [SystemRole.Umpire]: 'common.roles.UMPIRE',
    };
    const key = roleKeys[role];
    return key ? this.translateService.instant(key) : (role ?? '');
  }

  private rowToUser(row: any[]): UserBatchMigrationRequestItem | null {
    const get = (field: string): string => {
      const f = this.fieldMappings.find(x => x.dataField === field);
      if (!f || !f.excelColumn) return '';
      const idx = this.excelColumns.indexOf(f.excelColumn);
      if (idx < 0) return '';
      return String(row[idx] ?? '').trim();
    };

    const firstName = get('firstName');
    const lastName = get('lastName');
    const email = get('email');
    if (!firstName || !lastName || !email) return null;

    const dateVal = get('dateOfBirth');
    const dateOfBirth = this.normalizeDateOfBirth(dateVal) ?? this.normalizeDateOfBirth(Number(dateVal));
    if (!dateOfBirth) return null;

    const roleRaw = get('role');
    const role = roleRaw ? this.normalizeRole(roleRaw) : (this.defaultRole || null);
    if (!role) return null;

    return { firstName, lastName, dateOfBirth, email, role, username: email };
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
        const users: UserBatchMigrationRequestItem[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const item = this.rowToUser(jsonData[i]);
          if (item) users.push(item);
        }
        this.parsedUsers = users;
        this.step = 'preview';
        this.error = null;
        this.cdr.markForCheck();
      } catch {
        this.error = this.translateService.instant('users.migration.fileReadError');
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  goBackToMapping(): void {
    this.step = 'mapping';
    this.parsedUsers = [];
    this.cdr.markForCheck();
  }

  private migrateChunkWithRetry(chunk: UserBatchMigrationRequestItem[]) {
    const request: UserBatchMigrationRequest = { users: chunk };
    return this.usersService.migrateUsers(request).pipe(
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
      map((r): { success: true; response: UserBatchMigrationResponse } => ({ success: true, response: r })),
      catchError((err: unknown) => of({ success: false as const, error: err })),
    );
  }

  migrate(): void {
    if (this.parsedUsers.length === 0) {
      this.error = this.translateService.instant('users.migration.noValidRecords');
      this.cdr.markForCheck();
      return;
    }
    this.migrating = true;
    this.error = null;
    this.migrationResult = null;
    const chunks: UserBatchMigrationRequestItem[][] = [];
    for (let i = 0; i < this.parsedUsers.length; i += BATCH_SIZE) {
      chunks.push(this.parsedUsers.slice(i, i + BATCH_SIZE));
    }
    const totalChunks = chunks.length;
    this.migrationProgress = this.translateService.instant('users.migration.progress', { count: this.parsedUsers.length, chunks: totalChunks });
    this.cdr.markForCheck();

    const requests = chunks.map((chunk) => this.migrateChunkWithRetry(chunk));

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Array<{ success: true; response: UserBatchMigrationResponse } | { success: false; error: unknown }>) => {
          this.migrating = false;
          this.migrationProgress = '';
          let totalCreated = 0;
          let totalSkipped = 0;
          const skippedItems: Array<{ user: UserBatchMigrationRequestItem; reason: string }> = [];
          const failedChunkErrors: Array<{ chunkIndex: number; message: string }> = [];
          results.forEach((r, index) => {
            if (r.success) {
              totalCreated += r.response.created?.length ?? 0;
              (r.response.skipped ?? []).forEach((s) => {
                if (s.user != null && s.reason != null)
                  skippedItems.push({ user: s.user, reason: s.reason });
              });
              totalSkipped += r.response.skipped?.length ?? 0;
            } else {
              const errorMsg = this.getErrorMessage(r.error);
              failedChunkErrors.push({ chunkIndex: index + 1, message: errorMsg });
              chunks[index].forEach((user) => {
                skippedItems.push({ user, reason: errorMsg });
              });
              totalSkipped += chunks[index].length;
            }
          });
          this.migrationResult = {
            totalCreated,
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
    if (this.migrationResult && this.migrationResult.totalCreated > 0) {
      this.migrated.emit();
    }
    this.closed.emit();
  }
}
