import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { ValueHelpColumn } from '../../../../shared/components/value-help-dialog/value-help-dialog.component';
import { ClubsService, UsersService, UserDto, ClubCreateRequest, ClubDto, ScopeType } from '../../../../core/services/api';
import { takeUntil, Subject, Observable, forkJoin, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-club-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './add-club-dialog.component.html',
  styleUrl: './add-club-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddClubDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private assignedAdminIds: Set<string> = new Set();

  formData = {
    name: '',
    shortName: '',
    clubEmail: '',
    clubAdminId: '',
    type: ScopeType.Internal as ScopeType,
  };

  scopeTypeOptions: SearchableSelectOption[] = [];
  readonly ScopeType = ScopeType;

  saving = false;
  error: string | null = null;

  constructor(
    private clubsService: ClubsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {
    this.initScopeTypeOptions();
  }

  private initScopeTypeOptions(): void {
    this.scopeTypeOptions = [
      { value: ScopeType.Internal, label: this.translateService.instant('clubs.scopeTypes.internal') },
      { value: ScopeType.External, label: this.translateService.instant('clubs.scopeTypes.external') },
      { value: ScopeType.National, label: this.translateService.instant('clubs.scopeTypes.national') },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  adminSearch = (query: string): Observable<SearchableSelectOption[]> =>
    forkJoin({
      admins: this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", query || undefined, undefined, 100, 0) as any,
      clubs: fetchAllPages((skip, top) =>
        this.clubsService.getAllClubs(undefined, undefined, undefined, top, skip, ['clubAdminUser'] as any) as any
      ),
    }).pipe(
      map(({ admins, clubs }: any) => {
        const assigned = new Set<string>();
        (clubs as ClubDto[]).forEach((club: ClubDto) => {
          if (club.clubAdminId) assigned.add(club.clubAdminId);
        });
        this.assignedAdminIds = assigned;
        return (admins.content || []).map((admin: UserDto) => ({
          value: admin.uuid || '',
          label: this.getAdminDisplayName(admin),
          disabled: admin.uuid ? assigned.has(admin.uuid) : false,
        }));
      }),
    );

  adminValueHelpColumns: ValueHelpColumn[] = [
    { key: 'displayName', label: this.translateService.instant('users.columns.name') },
    { key: 'email', label: this.translateService.instant('users.columns.email') },
    { key: 'statusLabel', label: this.translateService.instant('users.columns.status') },
    { key: 'assignedLabel', label: this.translateService.instant('users.columns.assigned') },
  ];

  adminValueHelpSearch = (query: string): Observable<any[]> =>
    (this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", query || undefined, undefined, 100, 0) as any).pipe(
      map((response: any) => {
        const adminList: UserDto[] = response.content || [];
        return adminList.map((admin: UserDto) => ({
          uuid: admin.uuid || '',
          displayName: this.getAdminDisplayName(admin),
          email: admin.email || '-',
          statusLabel: admin.isActive
            ? this.translateService.instant('common.active')
            : this.translateService.instant('common.inactive'),
          assignedLabel: admin.assignedToClub
            ? this.translateService.instant('common.yes')
            : this.translateService.instant('common.no'),
          isAssigned: admin.uuid ? this.assignedAdminIds.has(admin.uuid) : false,
        }));
      }),
    );

  isAdminDisabled = (row: any): boolean => row.isAssigned;

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      clubEmail: '',
      clubAdminId: '',
      type: ScopeType.Internal,
    };
    this.error = null;
    this.saving = false;
  }

  getAdminDisplayName(admin: UserDto): string {
    const name = `${admin.firstName || ''} ${admin.lastName || ''}`.trim();
    return name || admin.username || '-';
  }

  onAdminSelectionChange(value: string | null): void {
    this.formData.clubAdminId = value || '';
    this.cdr.markForCheck();
  }

  get isFormValid(): boolean {
    return !!(this.formData.name && this.formData.shortName && this.formData.clubEmail && this.formData.type);
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ClubCreateRequest = {
      name: this.formData.name.trim(),
      shortName: this.formData.shortName.trim(),
      clubEmail: this.formData.clubEmail.trim(),
      clubAdminId: this.formData.clubAdminId || undefined,
      type: this.formData.type,
    };

    this.clubsService.createClub(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.saving = false;
        this.added.emit();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || this.translateService.instant('clubs.form.createError');
        this.cdr.markForCheck();
      }
    });
  }
}


