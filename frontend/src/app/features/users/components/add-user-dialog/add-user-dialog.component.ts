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
import {
  UsersService,
  UserCreateRequest,
  SystemRole,
  ScopeType,
} from '../../../../core/services/api';
import { ScopeVisibilityService } from '../../../../core/services/scope-visibility.service';
import { takeUntil, Subject, catchError, of } from 'rxjs';

@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    scopeType: ScopeType.Internal as ScopeType,
  };

  saving = false;
  error: string | null = null;

  roleOptions: SearchableSelectOption[] = [];
  readonly ScopeType = ScopeType;

  /**
   * Whether the scope field should be shown.
   * Only show when creating CLUB_ADMIN AND creator can assign different scopes.
   */
  get showScopeField(): boolean {
    if (this.formData.role !== 'CLUB_ADMIN') return false;
    return this.scopeVisibility.canAssignDifferentScopes();
  }

  /**
   * Available scope options based on user's permissions.
   */
  get scopeTypeOptions(): SearchableSelectOption[] {
    const allowedScopes = this.scopeVisibility.getAvailableScopeOptionsForCreate();
    const scopeLabels: Record<ScopeType, string> = {
      [ScopeType.Internal]: 'Вътрешен',
      [ScopeType.External]: 'Външен',
      [ScopeType.National]: 'Национален',
    };
    return allowedScopes.map(scope => ({
      value: scope,
      label: scopeLabels[scope],
    }));
  }

  private roleLabels: Record<SystemRole, string> = {
    APP_ADMIN: 'Администратор',
    FEDERATION_ADMIN: 'Администратор на федерацията',
    CLUB_ADMIN: 'Администратор на клуб',
    COACH: 'Треньор',
  };

  constructor(
    private usersService: UsersService,
    private scopeVisibility: ScopeVisibilityService,
    private cdr: ChangeDetectorRef,
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
      this.userRole === 'CLUB_ADMIN' ? 'COACH' : ('' as SystemRole | '');

    this.formData = {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      username: '',
      role: defaultRole,
      scopeType: ScopeType.Internal,
    };
    this.error = null;
    this.saving = false;
  }

  private updateRoleOptions(): void {
    if (!this.userRole) {
      this.roleOptions = [];
      return;
    }

    let availableRoles: SystemRole[] = [];

    if (this.userRole === 'APP_ADMIN') {
      availableRoles = ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH'];
    } else if (this.userRole === 'FEDERATION_ADMIN') {
      availableRoles = ['CLUB_ADMIN', 'COACH'];
    } else if (this.userRole === 'CLUB_ADMIN') {
      availableRoles = ['COACH'];
    }

    this.roleOptions = availableRoles.map((role) => ({
      value: role,
      label: this.roleLabels[role],
    }));
  }

  isUsernameLocked(): boolean {
    if (this.userRole === 'CLUB_ADMIN') {
      return true; // Always locked for club admin
    }
    return !this.formData.email; // Locked until email entered for admins
  }

  onEmailChange(): void {
    if (this.userRole === 'CLUB_ADMIN') {
      this.formData.username = this.formData.email;
    } else if (
      this.userRole === 'APP_ADMIN' ||
      this.userRole === 'FEDERATION_ADMIN'
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
    if (!this.isFormValid()) {
      this.error = 'Моля, попълнете всички задължителни полета';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    // Determine scope for CLUB_ADMIN
    let scopeType: ScopeType | undefined = undefined;
    if (this.formData.role === 'CLUB_ADMIN') {
      if (this.showScopeField) {
        // User can assign different scopes - use their selection
        scopeType = this.formData.scopeType;
      } else {
        // User can only create with their own scope
        scopeType = this.scopeVisibility.getUserScope();
      }
    }

    const createRequest: UserCreateRequest = {
      firstName: this.formData.firstName,
      lastName: this.formData.lastName,
      dateOfBirth: this.formData.dateOfBirth || '',
      email: this.formData.email,
      username: this.formData.username || undefined,
      role: this.formData.role as SystemRole,
      scopeType: scopeType,
    };

    this.usersService
      .createUser(createRequest)
      .pipe(
        catchError((err) => {
          this.error =
            err?.error?.message || 'Грешка при създаване на потребителя';
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
