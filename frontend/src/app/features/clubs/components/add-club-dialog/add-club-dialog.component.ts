import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { ClubsService, UsersService, UserDto, ClubCreateRequest, ClubDto } from '../../../../core/services/api';
import { takeUntil, Subject, forkJoin } from 'rxjs';

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

  formData = {
    name: '',
    shortName: '',
    clubEmail: '',
    clubAdminId: ''
  };

  availableAdmins: UserDto[] = [];
  adminOptions: SearchableSelectOption[] = [];
  loadingAdmins = false;
  
  assignedAdminIds: Set<string> = new Set();

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
      this.loadAdminsAndClubs();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      clubEmail: '',
      clubAdminId: ''
    };
    this.error = null;
    this.saving = false;
  }

  private loadAdminsAndClubs(): void {
    this.loadingAdmins = true;
    this.cdr.markForCheck();

    forkJoin({
      admins: this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", undefined, undefined, 1000, 0),
      clubs: this.clubsService.getAllClubs(undefined, undefined, undefined, 1000, 0, ['clubAdminUser'] as Array<'clubAdminUser'>)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ admins, clubs }) => {
        this.availableAdmins = admins.content || [];
        
        this.assignedAdminIds = new Set();
        (clubs.content || []).forEach((club: ClubDto) => {
          if (club.clubAdminId) {
            this.assignedAdminIds.add(club.clubAdminId);
          }
        });

        this.adminOptions = this.availableAdmins.map(admin => ({
          value: admin.uuid || '',
          label: this.getAdminDisplayName(admin),
          disabled: admin.uuid ? this.assignedAdminIds.has(admin.uuid) : false
        }));

        this.loadingAdmins = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableAdmins = [];
        this.adminOptions = [];
        this.assignedAdminIds = new Set();
        this.loadingAdmins = false;
        this.cdr.markForCheck();
      }
    });
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
    return !!(this.formData.name && this.formData.shortName && this.formData.clubEmail && this.formData.clubAdminId);
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
      clubAdminId: this.formData.clubAdminId
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

