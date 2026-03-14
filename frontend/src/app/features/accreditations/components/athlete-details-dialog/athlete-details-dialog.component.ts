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
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { PhotoCropDialogComponent } from '../photo-crop-dialog/photo-crop-dialog.component';
import {
  AthletePhotoViewDialogComponent,
  AthletePhotoViewInfo,
} from '../athlete-photo-view-dialog/athlete-photo-view-dialog.component';
import {
  AccreditationDto,
  AthletePhotoDto,
  AthletesService,
  AthleteUpdateRequest,
  AccreditationsService,
  AccreditationStatus,
  AthletePhotosService,
  ClubDto,
  Gender,
} from '../../../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { ScopeVisibilityService } from '../../../../core/services/scope-visibility.service';

const DEFAULT_MEDICAL_DURATION_MONTHS = 12;
import { calculateRaceGroup } from '../../../../shared/utils/race-group.util';
import { SystemRole } from '../../../../core/models/navigation.model';

interface AccreditationHistoryItem {
  uuid: string;
  club: string;
  accreditationNumber: string;
  year: number;
  status: string;
  statusRaw: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-athlete-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    PhotoCropDialogComponent,
    AthletePhotoViewDialogComponent,
    DatePickerComponent,
  ],
  templateUrl: './athlete-details-dialog.component.html',
  styleUrl: './athlete-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() accreditation: AccreditationDto | null = null;
  @Input() canEdit = false;
  @Input() userRole: SystemRole | null = null;
  @Input() userClub: ClubDto | null = null;
  @Input() showScopeInDetails = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  isEditing = false;
  showEditingWarningDialog = false;
  loading = false;
  loadingHistory = false;
  saving = false;
  error: string | null = null;
  fullHistory: AccreditationDto[] = [];
  uploadingPhoto = false;
  photoError: string | null = null;
  latestPhoto: AthletePhotoDto | null = null;
  photoHistory: AthletePhotoDto[] = [];
  photoHistoryIndex = 0;
  photoHistoryPageSize = 10;
  photoTotalCount = 0;
  showCropDialog = false;
  pendingPhotoFile: File | null = null;
  showPhotoViewDialog = false;
  private readonly currentYear = new Date().getFullYear();
  private readonly maxPhotoSizeBytes = 10 * 1024 * 1024; // 10MB
  private readonly allowedPhotoTypes = ['image/jpeg', 'image/png'];
  historyPageSize = 50;
  historySkip = 0;
  historyTotal = 0;
  hasMoreHistory = false;

  editData = {
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    medicalExaminationStartDate: '',
    medicalExaminationDurationMonths: DEFAULT_MEDICAL_DURATION_MONTHS,
    insuranceFrom: '',
    insuranceTo: '',
  };

  statusChanges: Map<string, AccreditationStatus> = new Map();

  private statusLabels: Record<string, string> = {
    ACTIVE: 'Активна',
    PENDING_VALIDATION: 'Заявена',
    PENDING_PHOTO_VALIDATION: 'Чакаща снимка',
    NEW_PHOTO_REQUIRED: 'Нова снимка',
    EXPIRED: 'Изтекла',
    SUSPENDED: 'Спряна',
  };

  readonly statusOptions: { value: AccreditationStatus; label: string }[] = [
    { value: 'ACTIVE', label: 'Активна' },
    { value: 'PENDING_VALIDATION', label: 'Заявена' },
    { value: 'PENDING_PHOTO_VALIDATION', label: 'Чакаща снимка' },
    { value: 'NEW_PHOTO_REQUIRED', label: 'Нова снимка' },
    { value: 'EXPIRED', label: 'Изтекла' },
    { value: 'SUSPENDED', label: 'Спряна' },
  ];

  get statusSelectOptions(): SearchableSelectOption[] {
    return this.statusOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  readonly genderOptions = [
    { value: 'MALE', label: 'Мъж' },
    { value: 'FEMALE', label: 'Жена' },
  ];

  get genderSelectOptions(): SearchableSelectOption[] {
    return this.genderOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  constructor(
    private athletesService: AthletesService,
    private accreditationsService: AccreditationsService,
    private athletePhotosService: AthletePhotosService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.accreditation) {
      this.resetForm();
      this.loadAccreditationHistory();
    }
  }

  get displayPhotoUrl(): string | null {
    const url = this.latestPhoto?.photoUrl;
    return this.normalizePhotoUrl(url);
  }

  get currentHistoryPhotoUrl(): string | null {
    const url = this.currentHistoryPhoto?.photoUrl;
    return this.normalizePhotoUrl(url);
  }

  get athlete() {
    return this.accreditation?.athlete;
  }

  private get currentHistoryPhoto(): AthletePhotoDto | null {
    if (this.latestPhoto) {
      if (this.photoHistoryIndex === 0) {
        return this.latestPhoto;
      }
      return this.photoHistory[this.photoHistoryIndex - 1] ?? this.latestPhoto;
    }
    return this.photoHistory[this.photoHistoryIndex] ?? null;
  }

  private normalizePhotoUrl(url: string | undefined | null): string | null {
    return url && (url.startsWith('http://') || url.startsWith('https://'))
      ? url
      : null;
  }

  get canUploadPhoto(): boolean {
    if (
      (this.userRole !== 'CLUB_ADMIN' && this.userRole !== 'COACH') ||
      !this.userClub?.uuid ||
      !this.athlete?.uuid
    ) {
      return false;
    }
    return this.fullHistory.some(
      (acc) =>
        acc.year === this.currentYear &&
        acc.status === 'NEW_PHOTO_REQUIRED' &&
        acc.clubId === this.userClub?.uuid,
    );
  }

  get fullName(): string {
    if (!this.athlete) return 'Състезател';
    const name = [
      this.athlete.firstName,
      this.athlete.middleName,
      this.athlete.lastName,
    ]
      .filter(Boolean)
      .join(' ');
    return name || 'Състезател';
  }

  isDateExpired(dateStr: string | undefined): boolean {
    if (!dateStr) return true;
    try {
      const date = new Date(dateStr);
      return date < new Date();
    } catch {
      return true;
    }
  }

  isInsuranceValid(): boolean {
    const from = this.athlete?.insuranceFrom;
    const to = this.athlete?.insuranceTo;
    if (!from || !to) return false;

    const now = new Date();
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return now >= fromDate && now <= toDate;
  }

  getInsurancePeriod(): string {
    const from = this.formatDate(this.athlete?.insuranceFrom);
    const to = this.formatDate(this.athlete?.insuranceTo);
    if (from === '-' && to === '-') return '-';
    return `${from} - ${to}`;
  }

  getInsuranceColorClass(): string {
    return this.isInsuranceValid() ? 'text-green-600' : 'text-red-600';
  }

  getMedicalExamColorClass(): string {
    return this.isDateExpired(this.athlete?.medicalExaminationDue)
      ? 'text-red-600'
      : 'text-green-600';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '-';
    return this.statusLabels[status] || status;
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'EXPIRED':
        return 'text-gray-500';
      case 'PENDING_VALIDATION':
      case 'PENDING_PHOTO_VALIDATION':
        return 'text-yellow-600';
      case 'NEW_PHOTO_REQUIRED':
        return 'text-orange-500';
      case 'SUSPENDED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getGenderLabel(gender: string | undefined): string {
    if (!gender) return '-';
    return gender === 'MALE' ? 'Мъж' : gender === 'FEMALE' ? 'Жена' : gender;
  }

  getScopeTypeLabel(scopeType: string | undefined): string {
    if (!scopeType) return '-';
    const labels: Record<string, string> = {
      INTERNAL: 'Вътрешен',
      EXTERNAL: 'Външен',
      NATIONAL: 'Национален',
    };
    return labels[scopeType] ?? scopeType;
  }

  getRaceGroup(): string {
    const raceGroup = calculateRaceGroup(
      this.athlete?.dateOfBirth,
      this.athlete?.gender,
    );
    return raceGroup.label || '-';
  }

  get photoViewInfo(): AthletePhotoViewInfo | null {
    if (!this.athlete) return null;
    const lastAcc = this.fullHistory[0] ?? this.accreditation;
    return {
      firstName: this.athlete.firstName ?? '',
      middleName: this.athlete.middleName ?? '',
      lastName: this.athlete.lastName ?? '',
      dateOfBirth: this.formatDate(this.athlete.dateOfBirth),
      raceGroup: this.getRaceGroup(),
      lastAccreditationClub: lastAcc?.club?.shortName ?? '-',
      lastAccreditationYear: lastAcc?.year ?? 0,
      lastAccreditationStatus: this.getStatusLabel(lastAcc?.status),
    };
  }

  get currentPhotoUploadedAt(): string | null {
    if (!this.isAdminUser) return null;
    const dt = this.currentHistoryPhoto?.uploadedAt;
    return dt ? this.formatDateTime(dt) : null;
  }

  get currentPhotoUploadedByName(): string | null {
    if (!this.isAdminUser) return null;
    const photo = this.currentHistoryPhoto;
    if (!photo) return null;
    const club = photo.uploadedBy as any;
    const shortName = club?.shortName ?? club?.name;
    if (typeof shortName === 'string' && shortName.trim().length > 0) {
      return shortName;
    }
    const byName = (photo as any).uploadedByName;
    if (typeof byName === 'string' && byName.trim().length > 0) {
      return byName;
    }
    return null;
  }

  get canPrevPhoto(): boolean {
    if (!this.isAdminUser) return false;
    const loadedCount = (this.latestPhoto ? 1 : 0) + this.photoHistory.length;
    if (loadedCount === 0) return false;
    const hasMoreLoaded = this.photoHistoryIndex < loadedCount - 1;
    const hasMoreOnServer = this.photoTotalCount > loadedCount;
    return hasMoreLoaded || hasMoreOnServer;
  }

  get canNextPhoto(): boolean {
    if (!this.isAdminUser) return false;
    return this.photoHistoryIndex > 0;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  get accreditationHistory(): AccreditationHistoryItem[] {
    return this.fullHistory.map((acc) => ({
      uuid: acc.uuid || '',
      club: acc.club?.shortName || '-',
      accreditationNumber: acc.accreditationNumber || '-',
      year: acc.year || 0,
      status: this.getStatusLabel(acc.status),
      statusRaw: acc.status || '',
      createdAt: this.formatDateTime(acc.createdAt),
      updatedAt: this.formatDateTime(acc.updatedAt),
    }));
  }

  get isAdminUser(): boolean {
    return (
      this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN'
    );
  }

  get hasHistoryWarning(): boolean {
    if (this.fullHistory.length < 2) return false;
    const lastAcc = this.fullHistory[0];
    const previousAcc = this.fullHistory[1];
    return lastAcc.clubId !== previousAcc.clubId;
  }

  get isNewAthlete(): boolean {
    return this.fullHistory.length === 1;
  }

  private loadAccreditationHistory(append: boolean = false): void {
    const athleteId = this.accreditation?.athleteId;
    if (!athleteId) return;

    if (!append) {
      this.historySkip = 0;
      this.fullHistory = [];
    }

    this.loadingHistory = true;
    this.cdr.markForCheck();

    // Build filter with required scope and club restrictions
    const filterParts: string[] = [`athleteId eq '${athleteId}'`];
    const defaults = this.scopeVisibility.buildDefaultFilter();

    if (defaults.scopeType) {
      filterParts.push(`scopeType eq '${defaults.scopeType}'`);
    }
    // For EXTERNAL/NATIONAL users, add club filter from userClub input
    if (!this.scopeVisibility.canViewClubFilter() && this.userClub?.uuid) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    }

    const filter = filterParts.join(' and ');

    this.accreditationsService
      .getAllAccreditations(
        filter,
        undefined,
        ['year_desc', 'modifiedAt_desc'], // Backend sorting (entity field is modifiedAt)
        this.historyPageSize,
        this.historySkip,
        ['club'], // expand club to get club name
      )
      .subscribe({
        next: (response) => {
          const newRecords = response.content || [];
          if (append) {
            this.fullHistory = [...this.fullHistory, ...newRecords];
          } else {
            this.fullHistory = newRecords;
          }
          this.historyTotal = response.totalElements || 0;
          this.hasMoreHistory = this.fullHistory.length < this.historyTotal;
          this.loadingHistory = false;
          if (!append && this.athlete?.uuid) {
            this.loadLatestPhoto();
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading accreditation history:', err);
          if (!append) {
            this.fullHistory = [];
          }
          this.loadingHistory = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadMoreHistory(): void {
    if (this.loadingHistory || !this.hasMoreHistory) return;
    this.historySkip += this.historyPageSize;
    this.loadAccreditationHistory(true);
  }

  onHistoryScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 50; // pixels from bottom
    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;

    if (atBottom && this.hasMoreHistory && !this.loadingHistory) {
      this.loadMoreHistory();
    }
  }

  close(): void {
    if (this.isEditing) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.error = null;
    this.closed.emit();
  }

  startEditing(): void {
    if (!this.canEdit || !this.athlete) return;

    const { startDate: medicalStart, durationMonths: medicalDuration } =
      this.medicalDueToStartAndDuration(
        this.formatDateForInput(this.athlete.medicalExaminationDue),
      );
    this.editData = {
      firstName: this.athlete.firstName || '',
      middleName: this.athlete.middleName || '',
      lastName: this.athlete.lastName || '',
      gender: this.athlete.gender || '',
      dateOfBirth: this.formatDateForInput(this.athlete.dateOfBirth),
      medicalExaminationStartDate: medicalStart || '',
      medicalExaminationDurationMonths:
        medicalDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS,
      insuranceFrom: this.formatDateForInput(this.athlete.insuranceFrom),
      insuranceTo: this.formatDateForInput(this.athlete.insuranceTo),
    };
    this.statusChanges.clear();
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.athlete?.uuid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const profileRequest: AthleteUpdateRequest = {
      firstName: this.editData.firstName || undefined,
      middleName: this.editData.middleName || undefined,
      lastName: this.editData.lastName || undefined,
      gender:
        this.editData.gender &&
        Object.values(Gender).includes(this.editData.gender as Gender)
          ? (this.editData.gender as Gender)
          : undefined,
      dateOfBirth: this.editData.dateOfBirth || undefined,
    };
    const profileRequest$ = this.athletesService.patchAthleteByUuid(
      this.athlete.uuid,
      profileRequest,
    );

    const { startDate: origMedicalStart, durationMonths: origMedicalDuration } =
      this.medicalDueToStartAndDuration(
        this.formatDateForInput(this.athlete.medicalExaminationDue),
      );
    const medicalChanged =
      this.editData.medicalExaminationStartDate !== (origMedicalStart || '') ||
      this.editData.medicalExaminationDurationMonths !==
        (origMedicalDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS) ||
      this.editData.insuranceFrom !==
        this.formatDateForInput(this.athlete.insuranceFrom) ||
      this.editData.insuranceTo !==
        this.formatDateForInput(this.athlete.insuranceTo);
    const insuranceFrom = this.editData.insuranceFrom?.trim();
    const insuranceTo = this.editData.insuranceTo?.trim();
    const medicalStart = this.editData.medicalExaminationStartDate?.trim();
    const medicalDuration = this.editData.medicalExaminationDurationMonths;
    const hasInsurance = !!(insuranceFrom && insuranceTo);
    const hasMedical = !!(
      medicalStart &&
      medicalDuration != null &&
      medicalDuration >= 1
    );
    const hasMedicalFields = hasInsurance || hasMedical;
    let batchMedicalRequest$ = of(null as unknown as Array<unknown>);
    if (medicalChanged && hasMedicalFields) {
      const { startDate: existingStart, durationMonths: existingDuration } =
        this.medicalDueToStartAndDuration(
          this.formatDateForInput(this.athlete.medicalExaminationDue),
        );
      batchMedicalRequest$ = this.athletesService.batchUpdateMedicalInfo({
        athleteIds: [this.athlete.uuid],
        insuranceFrom: hasInsurance
          ? insuranceFrom!
          : this.formatDateForInput(this.athlete.insuranceFrom) || '',
        insuranceTo: hasInsurance
          ? insuranceTo!
          : this.formatDateForInput(this.athlete.insuranceTo) || '',
        medicalExaminationStartDate: hasMedical
          ? medicalStart!
          : existingStart || '',
        medicalExaminationDurationMonths: hasMedical
          ? medicalDuration!
          : (existingDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS),
      });
    }

    const statusUpdateRequests = Array.from(this.statusChanges.entries())
      .filter(([accreditationUuid, newStatus]) => {
        const originalAcc = this.fullHistory.find(
          (acc) => acc.uuid === accreditationUuid,
        );
        return originalAcc && originalAcc.status !== newStatus;
      })
      .map(([accreditationUuid, newStatus]) =>
        this.accreditationsService.patchAccreditationStatus(accreditationUuid, {
          status: newStatus,
        }),
      );

    const requests = [
      profileRequest$,
      batchMedicalRequest$,
      ...statusUpdateRequests,
    ];
    forkJoin(requests).subscribe({
      next: (results) => {
        const updatedAthlete = results[0] as any;
        if (updatedAthlete && this.accreditation) {
          this.accreditation.athlete = updatedAthlete;
        }
        this.saving = false;
        this.isEditing = false;
        this.error = null;
        this.statusChanges.clear();
        this.loadAccreditationHistory();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message || 'Грешка при запазване';
        this.cdr.markForCheck();
      },
    });
  }

  private medicalDueToStartAndDuration(dueYyyyMmDd: string | null): {
    startDate: string | null;
    durationMonths: number | null;
  } {
    if (!dueYyyyMmDd?.trim()) return { startDate: null, durationMonths: null };
    const d = dueYyyyMmDd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!d) return { startDate: null, durationMonths: null };
    const year = parseInt(d[1], 10);
    const month = parseInt(d[2], 10);
    const day = parseInt(d[3], 10);
    let startMonth = month - DEFAULT_MEDICAL_DURATION_MONTHS;
    let startYear = year;
    while (startMonth <= 0) {
      startMonth += 12;
      startYear -= 1;
    }
    const ms = String(startMonth).padStart(2, '0');
    const ds = String(Math.min(day, 28)).padStart(2, '0');
    return {
      startDate: `${startYear}-${ms}-${ds}`,
      durationMonths: DEFAULT_MEDICAL_DURATION_MONTHS,
    };
  }

  onStatusChange(accreditationUuid: string, value: string | null): void {
    if (value) {
      this.statusChanges.set(accreditationUuid, value as AccreditationStatus);
    } else {
      this.statusChanges.delete(accreditationUuid);
    }
    this.cdr.markForCheck();
  }

  getStatusValue(accreditationUuid: string, currentStatus: string): string {
    return this.statusChanges.get(accreditationUuid) || currentStatus;
  }

  private resetForm(): void {
    this.isEditing = false;
    this.error = null;
    this.saving = false;
    this.uploadingPhoto = false;
    this.photoError = null;
    this.latestPhoto = null;
    this.photoHistory = [];
    this.photoHistoryIndex = 0;
    this.photoTotalCount = 0;
    this.photoHistory = [];
    this.photoHistoryIndex = 0;
    this.statusChanges.clear();
    this.fullHistory = [];
    this.loadingHistory = false;
    this.historySkip = 0;
    this.historyTotal = 0;
    this.hasMoreHistory = false;
    this.showCropDialog = false;
    this.pendingPhotoFile = null;
    this.showPhotoViewDialog = false;
  }

  loadLatestPhoto(): void {
    const athleteId = this.athlete?.uuid;
    if (!athleteId) return;
    const top = 1;
    const skip = 0;
    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], top, skip, [
        'uploadedByClub',
      ])
      .subscribe({
        next: (res) => {
          const items = res.content ?? [];
          const first = items[0];
          this.latestPhoto = first ?? null;
          this.photoTotalCount =
            res.totalElements ?? (items.length > 0 ? 1 : 0);
          this.cdr.markForCheck();
        },
        error: () => {
          this.latestPhoto = null;
          this.photoHistory = [];
          this.photoHistoryIndex = 0;
          this.photoTotalCount = 0;
          this.cdr.markForCheck();
        },
      });
  }

  showPrevPhoto(): void {
    if (!this.isAdminUser) return;

    const athleteId = this.athlete?.uuid;
    const loadedCount = (this.latestPhoto ? 1 : 0) + this.photoHistory.length;

    if (this.photoHistoryIndex < loadedCount - 1) {
      this.photoHistoryIndex++;
      this.cdr.markForCheck();
      return;
    }

    if (!athleteId || this.photoTotalCount <= loadedCount) {
      return;
    }

    const skip = loadedCount;
    const remaining = this.photoTotalCount - loadedCount;
    const top = Math.min(this.photoHistoryPageSize, remaining);

    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], top, skip, [
        'uploadedByClub',
      ])
      .subscribe({
        next: (res) => {
          const newItems = res.content ?? [];
          if (newItems.length > 0) {
            this.photoHistory = [...this.photoHistory, ...newItems];
            const newLoadedCount =
              (this.latestPhoto ? 1 : 0) + this.photoHistory.length;
            if (this.photoHistoryIndex < newLoadedCount - 1) {
              this.photoHistoryIndex++;
            }
          }
          this.photoTotalCount = res.totalElements ?? this.photoTotalCount;
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  showNextPhoto(): void {
    if (!this.canNextPhoto) return;
    this.photoHistoryIndex--;
    this.cdr.markForCheck();
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    if (!this.allowedPhotoTypes.includes(file.type)) {
      this.photoError = 'Разрешени са само JPEG и PNG файлове.';
      this.cdr.markForCheck();
      return;
    }
    if (file.size > this.maxPhotoSizeBytes) {
      this.photoError = 'Файлът не трябва да надвишава 10 MB.';
      this.cdr.markForCheck();
      return;
    }
    input.value = '';
    this.pendingPhotoFile = file;
    this.showCropDialog = true;
    this.cdr.markForCheck();
  }

  closeCropDialog(): void {
    this.showCropDialog = false;
    this.pendingPhotoFile = null;
    this.cdr.markForCheck();
  }

  onPhotoCropped(blob: Blob): void {
    const type =
      blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const file = new File([blob], `photo.${ext}`, { type });
    this.uploadPhoto(file);
    this.closeCropDialog();
  }

  openPhotoView(): void {
    this.showPhotoViewDialog = true;
    this.cdr.markForCheck();
  }

  closePhotoViewDialog(): void {
    this.showPhotoViewDialog = false;
    this.cdr.markForCheck();
  }

  uploadPhoto(file: File): void {
    const athleteId = this.athlete?.uuid;
    if (!athleteId) {
      this.photoError = 'Липсва данни за състезател.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.canUploadPhoto) {
      this.photoError =
        'Качването не е позволено: състезателят трябва да има акредитация за тази година със статус "Нова снимка изискана" за вашия клуб.';
      this.cdr.markForCheck();
      return;
    }
    this.photoError = null;
    this.uploadingPhoto = true;
    this.cdr.markForCheck();
    this.athletePhotosService.uploadAthletePhoto(athleteId, file).subscribe({
      next: () => {
        this.uploadingPhoto = false;
        this.loadLatestPhoto();
        this.loadAccreditationHistory();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingPhoto = false;
        this.photoError =
          err?.error?.message ||
          err?.message ||
          'Грешка при качване на снимката.';
        this.cdr.markForCheck();
      },
    });
  }
}
