import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { PhotoCropDialogComponent } from '../../components/photo-crop-dialog/photo-crop-dialog.component';
import {
  AthletePhotoViewDialogComponent,
  AthletePhotoViewInfo,
} from '../../components/athlete-photo-view-dialog/athlete-photo-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
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
  ClubsService,
  ClubCoachesService,
} from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';
import { ScopeVisibilityService } from '../../../../core/services/scope-visibility.service';
import { SystemRole } from '../../../../core/models/navigation.model';
import { ScopeType } from '../../../../core/services/api';
import { calculateRaceGroup } from '../../../../shared/utils/race-group.util';

const DEFAULT_MEDICAL_DURATION_MONTHS = 12;

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
  selector: 'app-accreditation-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    DatePickerComponent,
    PhotoCropDialogComponent,
    AthletePhotoViewDialogComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './accreditation-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccreditationDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  accreditation: AccreditationDto | null = null;
  loading = true;
  error: string | null = null;

  isEditing = false;
  showEditingWarningDialog = false;
  loadingHistory = false;
  saving = false;
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
  private readonly maxPhotoSizeBytes = 10 * 1024 * 1024;
  private readonly allowedPhotoTypes = ['image/jpeg', 'image/png'];
  historyPageSize = 50;
  historySkip = 0;
  historyTotal = 0;
  hasMoreHistory = false;
  activeTab: 'details' | 'history' = 'details';

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
    [AccreditationStatus.Active]: 'Активна',
    [AccreditationStatus.PendingValidation]: 'Заявена',
    [AccreditationStatus.PendingPhotoValidation]: 'Чакаща снимка',
    [AccreditationStatus.NewPhotoRequired]: 'Нова снимка',
    [AccreditationStatus.Expired]: 'Изтекла',
    [AccreditationStatus.Suspended]: 'Спряна',
  };

  readonly statusOptions: { value: AccreditationStatus; label: string }[] = [
    { value: AccreditationStatus.Active, label: 'Активна' },
    { value: AccreditationStatus.PendingValidation, label: 'Заявена' },
    { value: AccreditationStatus.PendingPhotoValidation, label: 'Чакаща снимка' },
    { value: AccreditationStatus.NewPhotoRequired, label: 'Нова снимка' },
    { value: AccreditationStatus.Expired, label: 'Изтекла' },
    { value: AccreditationStatus.Suspended, label: 'Спряна' },
  ];

  get statusSelectOptions(): SearchableSelectOption[] {
    return this.statusOptions.map((opt) => ({ value: opt.value, label: opt.label }));
  }

  readonly genderOptions = [
    { value: Gender.MALE, label: 'Мъж' },
    { value: Gender.FEMALE, label: 'Жена' },
  ];

  get genderSelectOptions(): SearchableSelectOption[] {
    return this.genderOptions.map((opt) => ({ value: opt.value, label: opt.label }));
  }

  private userRole: SystemRole | null = null;
  private userClub: ClubDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private athletesService: AthletesService,
    private accreditationsService: AccreditationsService,
    private athletePhotosService: AthletePhotosService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private authService: AuthService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    // Load userClub for CLUB_ADMIN / COACH (needed for canUploadPhoto)
    if (user) {
      if (this.userRole === SystemRole.ClubAdmin) {
        this.clubsService.getClubByAdminId(user.uuid)
          .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
          .subscribe({ next: (club) => { this.userClub = club; this.cdr.markForCheck(); } });
      } else if (this.userRole === SystemRole.Coach) {
        this.clubCoachesService.getClubByCoachId(user.uuid)
          .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
          .subscribe({ next: (club) => { this.userClub = club; this.cdr.markForCheck(); } });
      }
    }

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.loadAccreditation(uuid);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get showScopeInDetails(): boolean {
    return this.scopeVisibility.canViewScopeField();
  }

  get athlete() {
    return this.accreditation?.athlete;
  }

  get fullName(): string {
    if (!this.athlete) return 'Състезател';
    const name = [this.athlete.firstName, this.athlete.middleName, this.athlete.lastName]
      .filter(Boolean).join(' ');
    return name || 'Състезател';
  }

  get displayPhotoUrl(): string | null {
    return this.normalizePhotoUrl(this.latestPhoto?.photoUrl);
  }

  get currentHistoryPhotoUrl(): string | null {
    return this.normalizePhotoUrl(this.currentHistoryPhoto?.photoUrl);
  }

  private get currentHistoryPhoto(): AthletePhotoDto | null {
    if (this.latestPhoto) {
      if (this.photoHistoryIndex === 0) return this.latestPhoto;
      return this.photoHistory[this.photoHistoryIndex - 1] ?? this.latestPhoto;
    }
    return this.photoHistory[this.photoHistoryIndex] ?? null;
  }

  private normalizePhotoUrl(url: string | undefined | null): string | null {
    return url && (url.startsWith('http://') || url.startsWith('https://')) ? url : null;
  }

  get canUploadPhoto(): boolean {
    if ((this.userRole !== SystemRole.ClubAdmin && this.userRole !== SystemRole.Coach) || !this.userClub?.uuid || !this.athlete?.uuid) {
      return false;
    }
    return this.fullHistory.some(
      (acc) => acc.year === this.currentYear && acc.status === AccreditationStatus.NewPhotoRequired && acc.clubId === this.userClub?.uuid,
    );
  }

  get isAdminUser(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get hasHistoryWarning(): boolean {
    if (this.fullHistory.length < 2) return false;
    return this.fullHistory[0].clubId !== this.fullHistory[1].clubId;
  }

  get isNewAthlete(): boolean {
    return this.fullHistory.length === 1;
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
      lastAccreditationNumber: lastAcc?.accreditationNumber ?? '-',
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
    if (typeof shortName === 'string' && shortName.trim().length > 0) return shortName;
    const byName = (photo as any).uploadedByName;
    if (typeof byName === 'string' && byName.trim().length > 0) return byName;
    return null;
  }

  get canPrevPhoto(): boolean {
    if (!this.isAdminUser) return false;
    const loadedCount = (this.latestPhoto ? 1 : 0) + this.photoHistory.length;
    if (loadedCount === 0) return false;
    return this.photoHistoryIndex < loadedCount - 1 || this.photoTotalCount > loadedCount;
  }

  get canNextPhoto(): boolean {
    if (!this.isAdminUser) return false;
    return this.photoHistoryIndex > 0;
  }

  get accreditationHistory(): AccreditationHistoryItem[] {    return this.fullHistory.map((acc) => ({
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

  private loadAccreditation(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.accreditationsService
      .getAccreditationByUuid(uuid, ['athlete', 'club'])
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при зареждане на акредитацията';
          this.loading = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (accreditation) => {
          this.accreditation = accreditation;
          this.loading = false;
          if (!accreditation) {
            this.error = this.error || 'Акредитацията не е намерена.';
            this.cdr.markForCheck();
          } else {
            this.loadAccreditationHistory();
          }
        },
      });
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

    const filterParts: string[] = [`athleteId eq '${athleteId}'`];
    const defaults = this.scopeVisibility.buildDefaultFilter();
    if (defaults.scopeType) filterParts.push(`scopeType eq '${defaults.scopeType}'`);
    if (!this.scopeVisibility.canViewClubFilter() && this.userClub?.uuid) {
      filterParts.push(`clubId eq '${this.userClub.uuid}'`);
    }
    const filter = filterParts.join(' and ');

    this.accreditationsService
      .getAllAccreditations(filter, undefined, ['year_desc', 'modifiedAt_desc'], this.historyPageSize, this.historySkip, ['club'])
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
        error: () => {
          if (!append) this.fullHistory = [];
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
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    if (atBottom && this.hasMoreHistory && !this.loadingHistory) {
      this.loadMoreHistory();
    }
  }

  loadLatestPhoto(): void {
    const athleteId = this.athlete?.uuid;
    if (!athleteId) return;
    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], 1, 0, ['uploadedByClub'])
      .subscribe({
        next: (res) => {
          const items = res.content ?? [];
          this.latestPhoto = items[0] ?? null;
          this.photoTotalCount = res.totalElements ?? (items.length > 0 ? 1 : 0);
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
    if (!athleteId || this.photoTotalCount <= loadedCount) return;
    const skip = loadedCount;
    const remaining = this.photoTotalCount - loadedCount;
    const top = Math.min(this.photoHistoryPageSize, remaining);
    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], top, skip, ['uploadedByClub'])
      .subscribe({
        next: (res) => {
          const newItems = res.content ?? [];
          if (newItems.length > 0) {
            this.photoHistory = [...this.photoHistory, ...newItems];
            const newLoadedCount = (this.latestPhoto ? 1 : 0) + this.photoHistory.length;
            if (this.photoHistoryIndex < newLoadedCount - 1) this.photoHistoryIndex++;
          }
          this.photoTotalCount = res.totalElements ?? this.photoTotalCount;
          this.cdr.markForCheck();
        },
        error: () => { this.cdr.markForCheck(); },
      });
  }

  showNextPhoto(): void {
    if (!this.canNextPhoto) return;
    this.photoHistoryIndex--;
    this.cdr.markForCheck();
  }

  startEditing(): void {
    if (!this.canEdit || !this.athlete) return;
    const { startDate: medicalStart, durationMonths: medicalDuration } =
      this.medicalDueToStartAndDuration(this.formatDateForInput(this.athlete.medicalExaminationDue));
    this.editData = {
      firstName: this.athlete.firstName || '',
      middleName: this.athlete.middleName || '',
      lastName: this.athlete.lastName || '',
      gender: this.athlete.gender || '',
      dateOfBirth: this.formatDateForInput(this.athlete.dateOfBirth),
      medicalExaminationStartDate: medicalStart || '',
      medicalExaminationDurationMonths: medicalDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS,
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
      gender: this.editData.gender && Object.values(Gender).includes(this.editData.gender as Gender)
        ? (this.editData.gender as Gender) : undefined,
      dateOfBirth: this.editData.dateOfBirth || undefined,
    };
    const profileRequest$ = this.athletesService.patchAthleteByUuid(this.athlete.uuid, profileRequest);

    const { startDate: origMedicalStart, durationMonths: origMedicalDuration } =
      this.medicalDueToStartAndDuration(this.formatDateForInput(this.athlete.medicalExaminationDue));
    const medicalChanged =
      this.editData.medicalExaminationStartDate !== (origMedicalStart || '') ||
      this.editData.medicalExaminationDurationMonths !== (origMedicalDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS) ||
      this.editData.insuranceFrom !== this.formatDateForInput(this.athlete.insuranceFrom) ||
      this.editData.insuranceTo !== this.formatDateForInput(this.athlete.insuranceTo);
    const insuranceFrom = this.editData.insuranceFrom?.trim();
    const insuranceTo = this.editData.insuranceTo?.trim();
    const medicalStart = this.editData.medicalExaminationStartDate?.trim();
    const medicalDuration = this.editData.medicalExaminationDurationMonths;
    const hasInsurance = !!(insuranceFrom && insuranceTo);
    const hasMedical = !!(medicalStart && medicalDuration != null && medicalDuration >= 1);
    let batchMedicalRequest$ = of(null as unknown as Array<unknown>);
    if (medicalChanged && (hasInsurance || hasMedical)) {
      const { startDate: existingStart, durationMonths: existingDuration } =
        this.medicalDueToStartAndDuration(this.formatDateForInput(this.athlete.medicalExaminationDue));
      batchMedicalRequest$ = this.athletesService.batchUpdateMedicalInfo({
        athleteIds: [this.athlete.uuid!],
        insuranceFrom: hasInsurance ? insuranceFrom! : this.formatDateForInput(this.athlete.insuranceFrom) || '',
        insuranceTo: hasInsurance ? insuranceTo! : this.formatDateForInput(this.athlete.insuranceTo) || '',
        medicalExaminationStartDate: hasMedical ? medicalStart! : existingStart || '',
        medicalExaminationDurationMonths: hasMedical ? medicalDuration! : (existingDuration ?? DEFAULT_MEDICAL_DURATION_MONTHS),
      });
    }

    const statusUpdateRequests = Array.from(this.statusChanges.entries())
      .filter(([uuid, newStatus]) => {
        const orig = this.fullHistory.find((acc) => acc.uuid === uuid);
        return orig && orig.status !== newStatus;
      })
      .map(([uuid, newStatus]) => this.accreditationsService.patchAccreditationStatus(uuid, { status: newStatus }));

    forkJoin([profileRequest$, batchMedicalRequest$, ...statusUpdateRequests]).subscribe({
      next: (results) => {
        const updatedAthlete = results[0] as any;
        if (updatedAthlete && this.accreditation) this.accreditation.athlete = updatedAthlete;
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

  private medicalDueToStartAndDuration(dueYyyyMmDd: string | null): { startDate: string | null; durationMonths: number | null } {
    if (!dueYyyyMmDd?.trim()) return { startDate: null, durationMonths: null };
    const d = dueYyyyMmDd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!d) return { startDate: null, durationMonths: null };
    const year = parseInt(d[1], 10), month = parseInt(d[2], 10), day = parseInt(d[3], 10);
    let startMonth = month - DEFAULT_MEDICAL_DURATION_MONTHS;
    let startYear = year;
    while (startMonth <= 0) { startMonth += 12; startYear -= 1; }
    return {
      startDate: `${startYear}-${String(startMonth).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`,
      durationMonths: DEFAULT_MEDICAL_DURATION_MONTHS,
    };
  }

  onStatusChange(accreditationUuid: string, value: string | null): void {
    if (value) this.statusChanges.set(accreditationUuid, value as AccreditationStatus);
    else this.statusChanges.delete(accreditationUuid);
    this.cdr.markForCheck();
  }

  getStatusValue(accreditationUuid: string, currentStatus: string): string {
    return this.statusChanges.get(accreditationUuid) || currentStatus;
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
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
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
      this.photoError = 'Качването не е позволено: състезателят трябва да има акредитация за тази година със статус "Нова снимка изискана" за вашия клуб.';
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
        this.photoError = err?.error?.message || err?.message || 'Грешка при качване на снимката.';
        this.cdr.markForCheck();
      },
    });
  }

  isDateExpired(dateStr: string | undefined): boolean {
    if (!dateStr) return true;
    try { return new Date(dateStr) < new Date(); } catch { return true; }
  }

  isInsuranceValid(): boolean {
    const from = this.athlete?.insuranceFrom;
    const to = this.athlete?.insuranceTo;
    if (!from || !to) return false;
    const now = new Date();
    return now >= new Date(from) && now <= new Date(to);
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
    return this.isDateExpired(this.athlete?.medicalExaminationDue) ? 'text-red-600' : 'text-green-600';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '-';
    return this.statusLabels[status] || status;
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case AccreditationStatus.Active: return 'text-green-600';
      case AccreditationStatus.Expired: return 'text-gray-500';
      case AccreditationStatus.PendingValidation:
      case AccreditationStatus.PendingPhotoValidation: return 'text-yellow-600';
      case AccreditationStatus.NewPhotoRequired: return 'text-orange-500';
      case AccreditationStatus.Suspended: return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getGenderLabel(gender: string | undefined): string {
    if (!gender) return '-';
    return gender === Gender.MALE ? 'Мъж' : gender === Gender.FEMALE ? 'Жена' : gender;
  }

  getScopeTypeLabel(scopeType: string | undefined): string {
    if (!scopeType) return '-';
    const labels: Record<string, string> = { [ScopeType.Internal]: 'Вътрешен', [ScopeType.External]: 'Външен', [ScopeType.National]: 'Национален' };
    return labels[scopeType] ?? scopeType;
  }

  getRaceGroup(): string {
    return calculateRaceGroup(this.athlete?.dateOfBirth, this.athlete?.gender).label || '-';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('bg-BG'); } catch { return dateStr; }
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('bg-BG'); } catch { return dateStr; }
  }

  formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return ''; }
  }

  // ===== DELETE MAIN ACCREDITATION =====
  showDeleteMainConfirm = false;
  deleteMainError: string | null = null;
  deletingMain = false;

  confirmDeleteMain(): void {
    this.showDeleteMainConfirm = true;
    this.deleteMainError = null;
    this.cdr.markForCheck();
  }

  cancelDeleteMain(): void {
    this.showDeleteMainConfirm = false;
    this.deleteMainError = null;
    this.cdr.markForCheck();
  }

  deleteMain(): void {
    if (!this.accreditation?.uuid) return;
    this.deletingMain = true;
    this.cdr.markForCheck();
    this.accreditationsService.deleteAccreditation(this.accreditation.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/accreditations']);
        },
        error: (err) => {
          this.deletingMain = false;
          this.deleteMainError = err?.error?.message || 'Грешка при изтриване на картотека';
          this.cdr.markForCheck();
        },
      });
  }
}
