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
import {
  Subject,
  takeUntil,
  catchError,
  of,
  forkJoin,
  delay,
  retryWhen,
  throwError,
  scan,
  Observable,
  map,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { PhotoCropDialogComponent } from '../../../accreditations/components/photo-crop-dialog/photo-crop-dialog.component';
import { ClubLogoViewDialogComponent, ClubLogoViewInfo } from '../../components/club-logo-view-dialog/club-logo-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import {
  ClubDto,
  ClubCoachDto,
  ClubsService,
  ClubCoachesService,
  ClubUpdateRequest,
  UsersService,
  UserDto,
  ClubCoachCreateRequest,
} from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';
import { ScopeVisibilityService } from '../../../../core/services/scope-visibility.service';
import { SystemRole } from '../../../../core/models/navigation.model';
import { ScopeType } from '../../../../core/services/api';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-club-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    PhotoCropDialogComponent,
    ClubLogoViewDialogComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './club-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  club: ClubDto | null = null;
  loading = true;
  error: string | null = null;

  coaches: ClubCoachDto[] = [];
  loadingCoaches = false;

  isEditing = false;
  saving = false;
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
        (clubs as ClubDto[]).forEach((c: ClubDto) => {
          if (c.clubAdminId && c.uuid !== this.club?.uuid) assigned.add(c.clubAdminId);
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
      map(({ coaches }: any) => {
        const coachList: UserDto[] = coaches.content || [];
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

  private userRole: SystemRole | null = null;
  private userClubId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private usersService: UsersService,
    private authService: AuthService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.loadClub(uuid);
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

  get canManageCoaches(): boolean {
    if (!this.club?.uuid) return false;
    if (!this.scopeVisibility.canViewScopeField()) return false;
    if ((this.club as any).scopeType !== ScopeType.Internal) return false;
    if (this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin) return true;
    if (this.userRole === SystemRole.ClubAdmin && this.userClubId === this.club.uuid) return true;
    return false;
  }

  get canUploadLogo(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get showScopeInDetails(): boolean {
    return this.scopeVisibility.canViewScopeField();
  }

  get logoViewInfo(): ClubLogoViewInfo | null {
    if (!this.club) return null;
    return {
      shortName: this.club.shortName || '-',
      name: this.club.name || '-',
    };
  }

  get adminName(): string {
    if (!this.club) return '-';
    if (this.club.clubAdminUser) {
      return `${this.club.clubAdminUser.firstName || ''} ${this.club.clubAdminUser.lastName || ''}`.trim() || '-';
    }
    return '-';
  }

  private loadClub(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.clubsService
      .getClubByUuid(uuid, ['clubAdminUser'])
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при зареждане на клуба';
          this.loading = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (club) => {
          this.club = club;
          this.loading = false;
          if (!club) {
            this.error = this.error || 'Клубът не е намерен.';
          } else {
            this.loadCoaches();
          }
          this.cdr.markForCheck();
        },
      });
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
              if (error.status === 401 || error.status === 403 || error.status === 404) {
                throw error;
              }
              if (retryCount >= 2) throw error;
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
          } else if (error.status !== 404) {
            this.error = 'Грешка при зареждане на треньорите. Моля, опитайте отново.';
          }
          return of({ content: [] });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.coaches = response.content || [];
          this.loadingCoaches = false;
          this.cdr.markForCheck();
        },
      });
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

  getCoachName(coach: ClubCoachDto | null): string {
    if (!coach?.coach) return '-';
    return `${coach.coach.firstName || ''} ${coach.coach.lastName || ''}`.trim() || '-';
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
              if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 409) {
                throw error;
              }
              if (retryCount >= 2) throw error;
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при добавяне на треньор';
          if (err.status === 401) errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          else if (err.status === 403) errorMessage = 'Нямате права за тази операция.';
          else if (err.status === 409) errorMessage = err?.error?.message || 'Треньорът вече е добавен към клуба.';
          else if (err?.error?.message) errorMessage = err.error.message;
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
              if (error.status === 401 || error.status === 403 || error.status === 404) {
                throw error;
              }
              if (retryCount >= 2) throw error;
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при премахване на треньор';
          if (err.status === 401) errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          else if (err.status === 403) errorMessage = 'Нямате права за тази операция.';
          else if (err.status === 404) errorMessage = 'Треньорът не е намерен.';
          else if (err?.error?.message) errorMessage = err.error.message;
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
              if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 409) {
                throw error;
              }
              if (retryCount >= 2) throw error;
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 401) errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          else if (err.status === 403) errorMessage = 'Нямате права за тази операция.';
          else if (err.status === 404) errorMessage = 'Клубът не е намерен.';
          else if (err.status === 409) errorMessage = err?.error?.message || 'Конфликт при запазване. Моля, опитайте отново.';
          else if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub) => {
          if (updatedClub) this.club = updatedClub;
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
      this.logoError = 'Качването на лого е позволено само за администратори на федерацията и на приложението.';
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
              if (error.status === 401 || error.status === 403 || error.status === 404) {
                throw error;
              }
              if (retryCount >= 2) throw error;
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при качване на логото';
          if (err.status === 401) errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          else if (err.status === 403) errorMessage = 'Нямате права за тази операция.';
          else if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub) => {
          this.uploadingLogo = false;
          this.logoError = null;
          if (updatedClub) this.club = updatedClub;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uploadingLogo = false;
          this.logoError = err?.message || 'Грешка при качване на логото.';
          this.cdr.markForCheck();
        },
      });
  }

  getCoachDisplayName(coach: UserDto): string {
    return `${coach.firstName || ''} ${coach.lastName || ''}`.trim() || coach.username || '-';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  // ===== DELETE CLUB =====
  showDeleteConfirm = false;
  deleteError: string | null = null;
  deletingClub = false;

  confirmDelete(): void {
    this.showDeleteConfirm = true;
    this.deleteError = null;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteError = null;
    this.cdr.markForCheck();
  }

  deleteClub(): void {
    if (!this.club?.uuid) return;
    this.deletingClub = true;
    this.cdr.markForCheck();
    this.clubsService.deleteClubByUuid(this.club.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/clubs']);
        },
        error: (err) => {
          this.deletingClub = false;
          this.deleteError = err?.error?.message || 'Грешка при изтриване на клуб';
          this.cdr.markForCheck();
        },
      });
  }
}
