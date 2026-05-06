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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Subject,
  takeUntil,
  catchError,
  of,
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
import { AddUserDialogComponent } from '../../../users/components/add-user-dialog/add-user-dialog.component';
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

@Component({
  selector: 'app-club-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    PhotoCropDialogComponent,
    ClubLogoViewDialogComponent,
    DeleteConfirmDialogComponent,
    AddUserDialogComponent,
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
  touched: Record<string, boolean> = {};
  showEditingWarningDialog = false;

  editData = {
    name: '',
    shortName: '',
    isActive: true,
    clubAdminId: '',
  };

  adminOptions: SearchableSelectOption[] = [];

  adminSearch = (query: string): Observable<SearchableSelectOption[]> =>
    (this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", query || undefined, undefined, 100, 0) as any).pipe(
      map((response: any) => {
        const adminList: UserDto[] = response.content || [];
        return adminList.map((admin: UserDto) => {
          const isCurrentClubAdmin = admin.uuid === this.club?.clubAdminId;
          return {
            value: admin.uuid || '',
            label: this.getAdminDisplayName(admin),
            disabled: !isCurrentClubAdmin && !!admin.assignedToClub,
          };
        });
      }),
    );

  readonly statusOptions: SearchableSelectOption[] = [];

  showAddCoachForm = false;
  availableCoaches: UserDto[] = [];
  coachOptions: SearchableSelectOption[] = [];
  selectedCoachId = '';
  addingCoach = false;

  coachSearch = (query: string): Observable<SearchableSelectOption[]> =>
    (this.usersService.getAllUsers("role eq 'COACH'", query || undefined, undefined, 100, 0) as any).pipe(
      map((response: any) => {
        const coachList: UserDto[] = response.content || [];
        this.availableCoaches = coachList;
        return coachList.map((coach: UserDto) => ({
          value: coach.uuid || '',
          label: this.getCoachDisplayName(coach),
          disabled: !!coach.assignedToClub,
        }));
      }),
    );

  showRemoveCoachConfirm = false;
  coachToRemove: ClubCoachDto | null = null;
  showCreateCoachDialog = false;

  uploadingLogo = false;
  logoError: string | null = null;
  showCropDialog = false;
  pendingLogoFile: File | null = null;
  showLogoViewDialog = false;
  private readonly allowedLogoTypes = ['image/jpeg', 'image/png'];
  private readonly maxLogoSizeBytes = 10 * 1024 * 1024;

  userRole: SystemRole | null = null;
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
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    (this.statusOptions as SearchableSelectOption[]) = [
      { value: 'true', label: this.translateService.instant('common.active') },
      { value: 'false', label: this.translateService.instant('common.inactive') },
    ];

    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    if (user && this.userRole === SystemRole.ClubAdmin) {
      this.clubsService.getClubByAdminId(user.uuid)
        .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
        .subscribe((club) => {
          this.userClubId = club?.uuid ?? null;
          this.cdr.markForCheck();
        });
    } else if (user && this.userRole === SystemRole.Coach) {
      this.clubCoachesService.getClubByCoachId(user.uuid)
        .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
        .subscribe((club) => {
          this.userClubId = club?.uuid ?? null;
          this.cdr.markForCheck();
        });
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
    if (this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin) return true;
    if (this.userRole === SystemRole.ClubAdmin && this.club?.uuid && this.userClubId === this.club.uuid) return true;
    return false;
  }

  get canDelete(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get isEditFormValid(): boolean {
    return !!(this.editData.shortName?.trim() && this.editData.name?.trim());
  }

  get canManageCoaches(): boolean {
    if (!this.club?.uuid) return false;
    if (this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin) return true;
    if (this.userRole === SystemRole.ClubAdmin && this.userClubId === this.club.uuid) return true;
    return false;
  }

  get canUploadLogo(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get showScopeInDetails(): boolean {
    return this.scopeVisibility.canViewTypeField();
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
          this.error = err?.error?.message || this.translateService.instant('common.errorLoading');
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
            this.error = this.error || this.translateService.instant('common.errorNotFound');
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
            this.error = this.translateService.instant('common.errorSessionExpired');
          } else if (error.status === 403) {
            this.error = this.translateService.instant('common.errorNoPermission');
          } else if (error.status !== 404) {
            this.error = this.translateService.instant('clubs.details.coaches.addError');
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
      [ScopeType.Internal]: this.translateService.instant('clubs.scopeTypes.internal'),
      [ScopeType.External]: this.translateService.instant('clubs.scopeTypes.external'),
      [ScopeType.National]: this.translateService.instant('clubs.scopeTypes.national'),
    };
    return labels[scopeType] ?? scopeType;
  }

  getCoachName(coach: ClubCoachDto | null): string {
    if (!coach?.coach) return '-';
    return `${coach.coach.firstName || ''} ${coach.coach.lastName || ''}`.trim() || '-';
  }

  getCoachStatus(coach: ClubCoachDto): string {
    return coach.coach?.isActive ? this.translateService.instant('common.active') : this.translateService.instant('common.inactive');
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

  openCreateCoachDialog(): void {
    this.showCreateCoachDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateCoachDialog(): void {
    this.showCreateCoachDialog = false;
    this.cdr.markForCheck();
  }

  onCoachCreated(): void {
    this.showCreateCoachDialog = false;
    this.loadCoaches();
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
          let errorMessage = this.translateService.instant('clubs.details.coaches.addError');
          if (err.status === 401) errorMessage = this.translateService.instant('common.errorSessionExpired');
          else if (err.status === 403) errorMessage = this.translateService.instant('common.errorNoPermission');
          else if (err.status === 409) errorMessage = err?.error?.message || this.translateService.instant('clubs.details.coaches.alreadyAssigned');
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
          this.error = err?.message || this.translateService.instant('clubs.details.coaches.addError');
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
          let errorMessage = this.translateService.instant('clubs.details.coaches.removeError');
          if (err.status === 401) errorMessage = this.translateService.instant('common.errorSessionExpired');
          else if (err.status === 403) errorMessage = this.translateService.instant('common.errorNoPermission');
          else if (err.status === 404) errorMessage = this.translateService.instant('common.errorNotFound');
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
          this.error = err?.message || this.translateService.instant('clubs.details.coaches.removeError');
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
    this.touched = {};
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
    this.touched = {};
    this.error = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.club?.uuid) return;

    this.touched['shortName'] = true;
    this.touched['name'] = true;

    if (!this.isEditFormValid) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const updateRequest: ClubUpdateRequest = {
      name: this.editData.name.trim(),
      shortName: this.editData.shortName.trim(),
      isActive: this.editData.isActive,
      clubAdminId: this.editData.clubAdminId || undefined,
    };

    this.clubsService
      .updateClubByUuid(this.club.uuid, updateRequest)
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
          let errorMessage = this.translateService.instant('common.errorSaving');
          if (err.status === 401) errorMessage = this.translateService.instant('common.errorSessionExpired');
          else if (err.status === 403) errorMessage = this.translateService.instant('common.errorNoPermission');
          else if (err.status === 404) errorMessage = this.translateService.instant('common.errorNotFound');
          else if (err.status === 409) errorMessage = err?.error?.message || this.translateService.instant('common.errorConflict');
          else if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.isEditing = false;
          this.error = null;
          this.loadClub(this.club!.uuid!);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.message || this.translateService.instant('common.errorSaving');
          this.cdr.markForCheck();
        },
      });
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (!this.allowedLogoTypes.includes(file.type)) {
      this.logoError = this.translateService.instant('clubs.details.logo.onlyJpegPng');
      this.cdr.markForCheck();
      return;
    }

    if (file.size > this.maxLogoSizeBytes) {
      this.logoError = this.translateService.instant('clubs.details.logo.maxSize');
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
      this.logoError = this.translateService.instant('clubs.details.logo.adminOnly');
      this.cdr.markForCheck();
      return;
    }

    this.logoError = null;
    this.uploadingLogo = true;
    this.cdr.markForCheck();

    this.clubsService
      .updateClubLogoByUuid(this.club.uuid, file)
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
          let errorMessage = this.translateService.instant('clubs.details.logo.uploadError');
          if (err.status === 401) errorMessage = this.translateService.instant('common.errorSessionExpired');
          else if (err.status === 403) errorMessage = this.translateService.instant('common.errorNoPermission');
          else if (err?.error?.message) errorMessage = err.error.message;
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub: ClubDto) => {
          this.uploadingLogo = false;
          this.logoError = null;
          if (updatedClub) this.club = updatedClub;
          this.cdr.markForCheck();
        },
        error: (err: { message?: string }) => {
          this.uploadingLogo = false;
          this.logoError = err?.message || this.translateService.instant('clubs.details.logo.uploadError');
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
          this.deleteError = err?.error?.message || this.translateService.instant('common.errorDeleting');
          this.cdr.markForCheck();
        },
      });
  }
}
