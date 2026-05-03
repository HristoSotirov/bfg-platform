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
import { PhotoCropDialogComponent } from '../../../accreditations/components/photo-crop-dialog/photo-crop-dialog.component';
import { ClubLogoViewDialogComponent, ClubLogoViewInfo } from '../club-logo-view-dialog/club-logo-view-dialog.component';
import {
  ClubDto,
  ClubCoachDto,
  ClubsService,
  ClubCoachesService,
  ClubUpdateRequest,
  UsersService,
  UserDto,
  ClubCoachCreateRequest,
  ScopeType,
} from '../../../../core/services/api';
import {
  takeUntil,
  Subject,
  forkJoin,
  of,
  catchError,
  delay,
  retryWhen,
  tap,
  throwError,
  scan,
  Observable,
  map,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemRole } from '../../../../core/models/navigation.model';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-club-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, PhotoCropDialogComponent, ClubLogoViewDialogComponent],
  templateUrl: './club-details-dialog.component.html',
  styleUrl: './club-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() club: ClubDto | null = null;
  @Input() canEdit = false;
  @Input() canManageCoaches = false;
  @Input() userClubId: string | null = null;
  @Input() userRole: SystemRole | null = null;
  /** Show scope type (APP_ADMIN / FEDERATION_ADMIN only) */
  @Input() showScopeInDetails = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() logoUploaded = new EventEmitter<ClubDto>();

  private destroy$ = new Subject<void>();

  coaches: ClubCoachDto[] = [];
  loadingCoaches = false;

  isEditing = false;
  saving = false;
  error: string | null = null;
  showEditingWarningDialog = false;

  editData = {
    name: '',
    shortName: '',
    isActive: true,
    clubAdminId: '',
  };

  adminOptions: SearchableSelectOption[] = [];
  assignedAdminIds: Set<string> = new Set();

  adminSearch = (query: string): Observable<SearchableSelectOption[]> =>
    forkJoin({
      admins: this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", query || undefined, undefined, 100, 0) as any,
      clubs: fetchAllPages((skip, top) =>
        this.clubsService.getAllClubs(undefined, undefined, undefined, top, skip, undefined) as any
      ),
    }).pipe(
      map(({ admins, clubs }: any) => {
        const assigned = new Set<string>();
        (clubs as ClubDto[]).forEach((club: ClubDto) => {
          if (club.clubAdminId && club.uuid !== this.club?.uuid) assigned.add(club.clubAdminId);
        });
        this.assignedAdminIds = assigned;
        return (admins.content || []).map((admin: UserDto) => ({
          value: admin.uuid || '',
          label: this.getAdminDisplayName(admin),
          disabled: admin.uuid ? assigned.has(admin.uuid) : false,
        }));
      }),
    );

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  showAddCoachForm = false;
  availableCoaches: UserDto[] = [];
  coachOptions: SearchableSelectOption[] = [];
  selectedCoachId = '';
  addingCoach = false;

  coachSearch = (query: string): Observable<SearchableSelectOption[]> =>
    forkJoin({
      coaches: this.usersService.getAllUsers("role eq 'COACH'", query || undefined, undefined, 100, 0) as any,
      allClubs: fetchAllPages((skip, top) =>
        this.clubsService.getAllClubs("scopeType eq 'INTERNAL'", undefined, undefined, top, skip, undefined) as any
      ),
    }).pipe(
      map(({ coaches, allClubs }: any) => {
        const coachList: UserDto[] = coaches.content || [];
        const clubs: ClubDto[] = allClubs as ClubDto[];
        // Build assigned set from clubs (async — just use coaches already in this club)
        const alreadyAssignedIds = new Set<string>(
          this.coaches.map((c) => c.userId).filter(Boolean) as string[]
        );
        this.availableCoaches = coachList;
        return coachList.map((coach) => ({
          value: coach.uuid || '',
          label: this.getCoachDisplayName(coach),
          disabled: coach.uuid ? alreadyAssignedIds.has(coach.uuid) : false,
        }));
      }),
    );

  showRemoveCoachConfirm = false;
  coachToRemove: ClubCoachDto | null = null;

  uploadingLogo = false;
  logoError: string | null = null;
  showCropDialog = false;
  pendingLogoFile: File | null = null;
  showLogoViewDialog = false;
  private readonly allowedLogoTypes = ['image/jpeg', 'image/png'];
  private readonly maxLogoSizeBytes = 10 * 1024 * 1024;

  constructor(
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.club) {
      this.resetState();
      this.loadCoaches();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  get canUploadLogo(): boolean {
    return (
      this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin
    );
  }

  get logoViewInfo(): ClubLogoViewInfo | null {
    if (!this.club) return null;
    return {
      shortName: this.club.shortName || '-',
      name: this.club.name || '-'
    };
  }

  openLogoView(): void {
    this.showLogoViewDialog = true;
    this.cdr.markForCheck();
  }

  closeLogoViewDialog(): void {
    this.showLogoViewDialog = false;
    this.cdr.markForCheck();
  }

  getScopeTypeLabel(scopeType: string | undefined): string {
    if (!scopeType) return '-';
    const labels: Record<string, string> = {
      [ScopeType.Internal]: 'Вътрешен',
      [ScopeType.External]: 'Външен',
      [ScopeType.National]: 'Национален',
    };
    return labels[scopeType] ?? scopeType;
  }

  get adminName(): string {
    if (!this.club) return '-';
    if (this.club.clubAdminUser) {
      return (
        `${this.club.clubAdminUser.firstName || ''} ${this.club.clubAdminUser.lastName || ''}`.trim() ||
        '-'
      );
    }
    return '-';
  }

  close(): void {
    if (this.isEditing) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.showAddCoachForm = false;
    this.error = null;
    this.closed.emit();
  }

  private loadCoaches(): void {
    if (!this.club?.uuid) return;

    this.loadingCoaches = true;
    this.cdr.markForCheck();

    this.clubCoachesService
      .getClubCoaches(this.club.uuid, undefined, undefined, 100, 0, ['coach'])
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((retryCount, error: HttpErrorResponse) => {
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.error = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (error.status === 403) {
            this.error = 'Нямате права за достъп до тази информация.';
          } else if (error.status === 404) {
          } else {
            this.error =
              'Грешка при зареждане на треньорите. Моля, опитайте отново.';
          }
          return of({ content: [] });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.coaches = response.content || [];
          this.loadingCoaches = false;
          this.error = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.coaches = [];
          this.loadingCoaches = false;
          this.cdr.markForCheck();
        },
      });
  }

  getCoachName(coach: ClubCoachDto | null): string {
    if (!coach) return '';
    
    if (coach.coach) {
      const firstName = coach.coach.firstName || '';
      const lastName = coach.coach.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || '-';
    }
    
    return '-';
  }

  getCoachStatus(coach: ClubCoachDto): string {
    return coach.coach?.isActive ? 'Активен' : 'Неактивен';
  }

  getCoachStatusClass(coach: ClubCoachDto): string {
    return coach.coach?.isActive ? 'text-green-600' : 'text-red-600';
  }

  openAddCoachForm(): void {
    this.showAddCoachForm = true;
    this.cdr.markForCheck();
  }

  closeAddCoachForm(): void {
    this.showAddCoachForm = false;
    this.selectedCoachId = '';
    this.availableCoaches = [];
    this.coachOptions = [];
    this.cdr.markForCheck();
  }

  onCoachSelectionChange(value: string | null): void {
    this.selectedCoachId = value || '';
    this.cdr.markForCheck();
  }

  addCoach(): void {
    if (!this.selectedCoachId || !this.club?.uuid) return;

    this.addingCoach = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ClubCoachCreateRequest = {
      clubId: this.club.uuid,
      coachId: this.selectedCoachId,
    };

    this.clubCoachesService
      .assignCoachToClub(request)
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((retryCount, error: HttpErrorResponse) => {
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404 ||
                error.status === 409
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при добавяне на треньор';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 409) {
            errorMessage =
              err?.error?.message || 'Треньорът вече е добавен към клуба.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.addingCoach = false;
          this.error = null;
          this.closeAddCoachForm();
          this.loadCoaches();
        },
        error: (err) => {
          this.addingCoach = false;
          this.error = err?.message || 'Грешка при добавяне на треньор';
          this.cdr.markForCheck();
        },
      });
  }

  confirmRemoveCoach(coach: ClubCoachDto): void {
    if (!coach.uuid) return;
    this.coachToRemove = coach;
    this.showRemoveCoachConfirm = true;
    this.cdr.markForCheck();
  }

  closeRemoveCoachConfirm(): void {
    this.showRemoveCoachConfirm = false;
    this.coachToRemove = null;
    this.cdr.markForCheck();
  }

  removeCoach(): void {
    if (!this.coachToRemove?.uuid) return;

    const coachUuid = this.coachToRemove.uuid;
    this.error = null;
    this.showRemoveCoachConfirm = false;
    this.clubCoachesService
      .removeCoachFromClub(coachUuid)
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((retryCount, error: HttpErrorResponse) => {
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при премахване на треньор';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Треньорът не е намерен.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.error = null;
          this.coachToRemove = null;
          this.loadCoaches();
        },
        error: (err) => {
          this.error = err?.message || 'Грешка при премахване на треньор';
          this.coachToRemove = null;
          this.cdr.markForCheck();
        },
      });
  }

  startEditing(): void {
    if (!this.canEdit || !this.club) return;

    this.editData = {
      name: this.club.name || '',
      shortName: this.club.shortName || '',
      isActive: this.club.isActive ?? true,
      clubAdminId: this.club.clubAdminId || '',
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  getAdminDisplayName(admin: UserDto): string {
    const name = `${admin.firstName || ''} ${admin.lastName || ''}`.trim();
    return name || admin.username || '-';
  }

  onAdminSelectionChange(value: string | null): void {
    this.editData.clubAdminId = value || '';
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    this.editData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.club?.uuid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const updateRequest: ClubUpdateRequest = {
      name: this.editData.name || undefined,
      shortName: this.editData.shortName || undefined,
      isActive: this.editData.isActive,
      clubAdminId: this.editData.clubAdminId || undefined,
    };

    this.clubsService
      .patchClubByUuid(this.club.uuid, updateRequest)
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((retryCount, error: HttpErrorResponse) => {
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404 ||
                error.status === 409
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Клубът не е намерен.';
          } else if (err.status === 409) {
            errorMessage =
              err?.error?.message ||
              'Конфликт при запазване. Моля, опитайте отново.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub) => {
          if (updatedClub) {
            this.club = updatedClub;
          }
          this.saving = false;
          this.isEditing = false;
          this.error = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.message || 'Грешка при запазване';
          this.cdr.markForCheck();
        },
      });
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (!this.allowedLogoTypes.includes(file.type)) {
      this.logoError = 'Разрешени са само JPEG и PNG файлове.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > this.maxLogoSizeBytes) {
      this.logoError = 'Файлът не трябва да надвишава 10 MB.';
      this.cdr.markForCheck();
      return;
    }

    input.value = '';
    this.pendingLogoFile = file;
    this.showCropDialog = true;
    this.cdr.markForCheck();
  }

  closeCropDialog(): void {
    this.showCropDialog = false;
    this.pendingLogoFile = null;
    this.cdr.markForCheck();
  }

  onLogoCropped(blob: Blob): void {
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const file = new File([blob], `logo.${ext}`, { type });
    this.uploadLogo(file);
    this.closeCropDialog();
  }

  private uploadLogo(file: File): void {
    if (!this.club?.uuid) return;

    if (!this.canUploadLogo) {
      this.logoError =
        'Качването на лого е позволено само за администратори на федерацията и на приложението.';
      this.cdr.markForCheck();
      return;
    }

    this.logoError = null;
    this.uploadingLogo = true;
    this.cdr.markForCheck();

    this.clubsService
      .patchClubLogoByUuid(this.club.uuid, file)
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((retryCount, error: HttpErrorResponse) => {
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при качване на логото';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub) => {
          this.uploadingLogo = false;
          this.logoError = null;
          if (updatedClub) {
            this.club = updatedClub;
            this.logoUploaded.emit(updatedClub);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uploadingLogo = false;
          this.logoError = err?.message || 'Грешка при качване на логото.';
          this.cdr.markForCheck();
        },
      });
  }

  private resetState(): void {
    this.isEditing = false;
    this.showAddCoachForm = false;
    this.error = null;
    this.saving = false;
    this.coaches = [];
    this.availableCoaches = [];
    this.coachOptions = [];
    this.selectedCoachId = '';
    this.adminOptions = [];
    this.assignedAdminIds = new Set();
    this.showRemoveCoachConfirm = false;
    this.coachToRemove = null;
    this.uploadingLogo = false;
    this.logoError = null;
    this.showCropDialog = false;
    this.pendingLogoFile = null;
    this.showLogoViewDialog = false;
  }

  getCoachDisplayName(coach: UserDto): string {
    return (
      `${coach.firstName || ''} ${coach.lastName || ''}`.trim() ||
      coach.username ||
      '-'
    );
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
}
