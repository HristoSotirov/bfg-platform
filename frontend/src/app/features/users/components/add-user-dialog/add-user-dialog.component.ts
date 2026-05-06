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
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import {
  UsersService,
  UserCreateRequest,
  SystemRole,
} from '../../../../core/services/api';
import { takeUntil, Subject, catchError, of } from 'rxjs';

@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    DatePickerComponent,
  ],
  templateUrl: './add-user-dialog.component.html',
  styleUrl: './add-user-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddUserDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() userRole: SystemRole | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    username: '',
    role: '' as SystemRole | '',
  };

  touched: Record<string, boolean> = {};
  saving = false;
  error: string | null = null;

  roleOptions: SearchableSelectOption[] = [];

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      this.updateRoleOptions();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
    if (changes['userRole']) {
      this.updateRoleOptions();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    const defaultRole =
      this.userRole === SystemRole.ClubAdmin ? SystemRole.Coach : ('' as SystemRole | '');

    this.formData = {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      username: '',
      role: defaultRole,
    };
    this.touched = {};
    this.error = null;
    this.saving = false;
  }

  private updateRoleOptions(): void {
    if (!this.userRole) {
      this.roleOptions = [];
      return;
    }

    const roleKeys: Record<SystemRole, string> = {
      [SystemRole.AppAdmin]: 'common.roles.APP_ADMIN',
      [SystemRole.FederationAdmin]: 'common.roles.FEDERATION_ADMIN',
      [SystemRole.ClubAdmin]: 'common.roles.CLUB_ADMIN',
      [SystemRole.Coach]: 'common.roles.COACH',
      [SystemRole.Umpire]: 'common.roles.UMPIRE',
    };

    let availableRoles: SystemRole[] = [];

    if (this.userRole === SystemRole.AppAdmin) {
      availableRoles = [SystemRole.AppAdmin, SystemRole.FederationAdmin, SystemRole.ClubAdmin, SystemRole.Coach, SystemRole.Umpire];
    } else if (this.userRole === SystemRole.FederationAdmin) {
      availableRoles = [SystemRole.ClubAdmin, SystemRole.Coach, SystemRole.Umpire];
    } else if (this.userRole === SystemRole.ClubAdmin) {
      availableRoles = [SystemRole.Coach];
    }

    this.roleOptions = availableRoles.map((role) => ({
      value: role,
      label: this.translateService.instant(roleKeys[role]),
    }));
  }

  isUsernameLocked(): boolean {
    if (this.userRole === SystemRole.ClubAdmin) {
      return true; // Always locked for club admin
    }
    return !this.formData.email; // Locked until email entered for admins
  }

  onEmailChange(): void {
    if (this.userRole === SystemRole.ClubAdmin) {
      this.formData.username = this.formData.email;
    } else if (
      this.userRole === SystemRole.AppAdmin ||
      this.userRole === SystemRole.FederationAdmin
    ) {
      if (this.formData.email) {
        this.formData.username = this.formData.email;
      } else {
        this.formData.username = '';
      }
    }
    this.cdr.markForCheck();
  }

  onRoleChange(value: string | null): void {
    this.formData.role = (value || '') as SystemRole | '';
  }

  save(): void {
    this.touched['firstName'] = true;
    this.touched['lastName'] = true;
    this.touched['dateOfBirth'] = true;
    this.touched['email'] = true;
    this.touched['role'] = true;

    if (!this.isFormValid()) {
      this.error = this.translateService.instant('users.form.requiredFields');
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const createRequest: UserCreateRequest = {
      firstName: this.formData.firstName.trim(),
      lastName: this.formData.lastName.trim(),
      dateOfBirth: this.formData.dateOfBirth || '',
      email: this.formData.email.trim(),
      username: this.formData.username?.trim() || undefined,
      role: this.formData.role as SystemRole,
    };

    this.usersService
      .createUser(createRequest)
      .pipe(
        catchError((err) => {
          this.error =
            err?.error?.message || this.translateService.instant('users.form.createError');
          this.saving = false;
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this.added.emit();
            this.close();
          }
        },
      });
  }

  private isFormValid(): boolean {
    return !!(
      this.formData.firstName &&
      this.formData.lastName &&
      this.formData.dateOfBirth &&
      this.formData.email &&
      this.formData.role
    );
  }
}
