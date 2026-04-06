import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
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
import { ScopeVisibilityService } from '../../../../core/services/scope-visibility.service';

@Component({
  selector: 'app-user-detail-page',
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
  showEditingWarningDialog = false;

  editData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    username: '',
    isActive: true,
  };

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  private roleLabels: Record<SystemRole, string> = {
    APP_ADMIN: 'Администратор',
    FEDERATION_ADMIN: 'Администратор на федерацията',
    CLUB_ADMIN: 'Администратор на клуб',
    COACH: 'Треньор',
  };

  constructor(
    private route: ActivatedRoute,
    private usersService: UsersService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private authService: AuthService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
  ) {}

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
    return user.roles.some(r => r === 'APP_ADMIN' || r === 'FEDERATION_ADMIN');
  }

  get showScopeInDetails(): boolean {
    return this.scopeVisibility.canViewScopeField();
  }

  get fullName(): string {
    if (!this.userData) return 'Потребител';
    const name = `${this.userData.firstName || ''} ${this.userData.lastName || ''}`.trim();
    return name || 'Потребител';
  }

  private loadUser(uuid: string): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.usersService
      .getUserByUuid(uuid)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при зареждане на потребителя';
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

    if (role === 'COACH') {
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
    } else if (role === 'CLUB_ADMIN') {
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
    return role === 'COACH' || role === 'CLUB_ADMIN';
  }

  startEditing(): void {
    if (!this.userData) return;
    this.isEditing = true;
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

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const updateRequest: UserUpdateRequest = {
      firstName: this.editData.firstName,
      lastName: this.editData.lastName,
      dateOfBirth: this.editData.dateOfBirth || undefined,
      username: this.editData.username,
      isActive: this.editData.isActive,
    };

    this.usersService
      .patchUserByUuid(this.userData.uuid, updateRequest)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при запазване на промените';
          this.saving = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedUser) => {
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
    return this.roleLabels[role] || role;
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
}
