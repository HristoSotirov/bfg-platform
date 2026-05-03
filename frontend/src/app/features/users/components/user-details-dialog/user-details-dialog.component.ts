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
import { takeUntil, Subject, catchError, of } from 'rxjs';

@Component({
  selector: 'app-user-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, DatePickerComponent],
  templateUrl: './user-details-dialog.component.html',
  styleUrl: './user-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() user: UserDto | null = null;
  @Input() canEdit = false;
  @Input() userRole: SystemRole | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  userData: UserDto | null = null;
  clubData: ClubDto | null = null;
  loading = false;
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
    [SystemRole.AppAdmin]: 'Администратор',
    [SystemRole.FederationAdmin]: 'Администратор на федерацията',
    [SystemRole.ClubAdmin]: 'Администратор на клуб',
    [SystemRole.Coach]: 'Треньор',
  };

  constructor(
    private usersService: UsersService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.user) {
      this.resetState();
      this.loadUser();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  get fullName(): string {
    if (!this.userData) return 'Потребител';
    const name = `${this.userData.firstName || ''} ${this.userData.lastName || ''}`.trim();
    return name || 'Потребител';
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

  private resetState(): void {
    this.userData = null;
    this.clubData = null;
    this.loading = false;
    this.error = null;
    this.isEditing = false;
    this.saving = false;
    this.editData = {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      username: '',
      isActive: true,
    };
  }

  private loadUser(): void {
    if (!this.user?.uuid) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.usersService
      .getUserByUuid(this.user.uuid)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при зареждане на потребителя';
          this.loading = false;
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
        error: () => {
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
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

  getRoleLabel(role: SystemRole | undefined): string {
    if (!role) return '-';
    return this.roleLabels[role] || role;
  }

}

