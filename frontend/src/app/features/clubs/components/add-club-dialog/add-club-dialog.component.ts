import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { ClubsService, UsersService, UserDto, ClubCreateRequest, ClubDto, ScopeType } from '../../../../core/services/api';
import { takeUntil, Subject, Observable, forkJoin, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-club-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
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
    scopeType: ScopeType.Internal as ScopeType,
  };

  scopeTypeOptions: SearchableSelectOption[] = [
    { value: ScopeType.Internal, label: 'Вътрешен' },
    { value: ScopeType.External, label: 'Външен' },
    { value: ScopeType.National, label: 'Национален' },
  ];
  readonly ScopeType = ScopeType;

  saving = false;
  error: string | null = null;

  constructor(
    private clubsService: ClubsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

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

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      clubEmail: '',
      clubAdminId: '',
      scopeType: ScopeType.Internal,
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
    return !!(this.formData.name && this.formData.shortName && this.formData.clubEmail && this.formData.clubAdminId && this.formData.scopeType);
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: ClubCreateRequest = {
      name: this.formData.name,
      shortName: this.formData.shortName,
      clubEmail: this.formData.clubEmail,
      clubAdminId: this.formData.clubAdminId,
      scopeType: this.formData.scopeType,
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
        this.error = err?.error?.message || 'Грешка при създаване на клуб';
        this.cdr.markForCheck();
      }
    });
  }
}


