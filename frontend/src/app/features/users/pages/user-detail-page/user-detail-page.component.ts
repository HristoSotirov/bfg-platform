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
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import {
  UserDto,
  UsersService,
  UserUpdateRequest,
  SystemRole,
  ClubsService,
  ClubCoachesService,
  ClubDto,
} from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-user-detail-page',
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
    DatePickerComponent,
    DeleteConfirmDialogComponent,
  ],
  templateUrl: './user-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  userData: UserDto | null = null;
  clubData: ClubDto | null = null;
  loading = true;
  error: string | null = null;

  isEditing = false;
  saving = false;
  touched: Record<string, boolean> = {};
  showEditingWarningDialog = false;

  editData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    username: '',
    isActive: true,
  };

  readonly statusOptions: SearchableSelectOption[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {
    this.statusOptions = [
      { value: 'true', label: this.translateService.instant('common.status.active') },
      { value: 'false', label: this.translateService.instant('common.status.inactive') },
    ];
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.loadUser(uuid);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    const user = this.authService.currentUser;
    if (!user) return false;
    return user.roles.some(r => r === SystemRole.AppAdmin || r === SystemRole.FederationAdmin);
  }

  get isEditFormValid(): boolean {
    return !!(this.editData.firstName?.trim() && this.editData.lastName?.trim());
  }

  get fullName(): string {
    if (!this.userData) return this.translateService.instant('users.details.defaultTitle');
    const name = `${this.userData.firstName || ''} ${this.userData.lastName || ''}`.trim();
    return name || this.translateService.instant('users.details.defaultTitle');
  }

  private loadUser(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.usersService
      .getUserByUuid(uuid)
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
        next: (user) => {
          this.userData = user;
          if (user) {
            this.loadClub(user);
          } else {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
      });
  }

  private loadClub(user: UserDto): void {
    const role = user.role;

    if (role === SystemRole.Coach) {
      this.clubCoachesService
        .getClubByCoachId(user.uuid!)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (club) => {
            this.clubData = club || null;
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
    } else if (role === SystemRole.ClubAdmin) {
      this.clubsService
        .getClubByAdminId(user.uuid!)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (club) => {
            this.clubData = club || null;
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
    } else {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  shouldShowClubSection(): boolean {
    const role = this.userData?.role;
    return role === SystemRole.Coach || role === SystemRole.ClubAdmin;
  }

  startEditing(): void {
    if (!this.userData) return;
    this.isEditing = true;
    this.touched = {};
    this.editData = {
      firstName: this.userData.firstName || '',
      lastName: this.userData.lastName || '',
      dateOfBirth: this.userData.dateOfBirth || '',
      username: this.userData.username || '',
      isActive: this.userData.isActive ?? true,
    };
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.touched = {};
    this.error = null;
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    if (value !== null) {
      this.editData.isActive = value === 'true';
    }
  }

  save(): void {
    if (!this.userData?.uuid) return;

    this.touched['firstName'] = true;
    this.touched['lastName'] = true;

    if (!this.isEditFormValid) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const updateRequest: UserUpdateRequest = {
      firstName: this.editData.firstName.trim(),
      lastName: this.editData.lastName.trim(),
      dateOfBirth: this.editData.dateOfBirth || undefined,
      username: this.editData.username.trim(),
      isActive: this.editData.isActive,
    };

    this.usersService
      .updateUserByUuid(this.userData.uuid, updateRequest)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || this.translateService.instant('common.errorSaving');
          this.saving = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedUser: UserDto | null) => {
          if (updatedUser) {
            this.userData = updatedUser;
            this.isEditing = false;
            this.saving = false;
            this.error = null;
            this.cdr.markForCheck();
          } else {
            this.saving = false;
            this.cdr.markForCheck();
          }
        },
      });
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

  getRoleLabel(role: SystemRole | undefined): string {
    if (!role) return '-';
    const roleKeys: Record<SystemRole, string> = {
      [SystemRole.AppAdmin]: 'common.roles.APP_ADMIN',
      [SystemRole.FederationAdmin]: 'common.roles.FEDERATION_ADMIN',
      [SystemRole.ClubAdmin]: 'common.roles.CLUB_ADMIN',
      [SystemRole.Coach]: 'common.roles.COACH',
      [SystemRole.Umpire]: 'common.roles.UMPIRE',
    };
    return this.translateService.instant(roleKeys[role]) || role;
  }

  // ===== DELETE USER =====
  showDeleteConfirm = false;
  deleteError: string | null = null;
  deletingUser = false;

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

  deleteUser(): void {
    if (!this.userData?.uuid) return;
    this.deletingUser = true;
    this.cdr.markForCheck();
    this.usersService.deleteUserByUuid(this.userData.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.deletingUser = false;
          this.deleteError = err?.error?.message || this.translateService.instant('common.errorDeleting');
          this.cdr.markForCheck();
        },
      });
  }
}
