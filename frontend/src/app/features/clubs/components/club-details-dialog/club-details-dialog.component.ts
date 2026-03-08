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
import {
  takeUntil,
  Subject,
  forkJoin,
  of,
  catchError,
  delay,
  retryWhen,
  tap,
  throwError,
  scan,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-club-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './club-details-dialog.component.html',
  styleUrl: './club-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubDetailsDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() club: ClubDto | null = null;
  @Input() canEdit = false;
  @Input() canManageCoaches = false;
  @Input() userClubId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  coaches: ClubCoachDto[] = [];
  loadingCoaches = false;

  isEditing = false;
  saving = false;
  error: string | null = null;
  showEditingWarningDialog = false;

  editData = {
    name: '',
    shortName: '',
    isActive: true,
    clubAdminId: '',
  };

  adminOptions: SearchableSelectOption[] = [];
  assignedAdminIds: Set<string> = new Set();
  loadingAdmins = false;

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  showAddCoachForm = false;
  availableCoaches: UserDto[] = [];
  coachOptions: SearchableSelectOption[] = [];
  selectedCoachId = '';
  addingCoach = false;
  loadingCoachesForAdd = false;

  showRemoveCoachConfirm = false;
  coachToRemove: ClubCoachDto | null = null;

  constructor(
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.club) {
      this.resetState();
      this.loadCoaches();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  get adminName(): string {
    if (!this.club) return '-';
    if (this.club.clubAdminUser) {
      return (
        `${this.club.clubAdminUser.firstName || ''} ${this.club.clubAdminUser.lastName || ''}`.trim() ||
        '-'
      );
    }
    return '-';
  }

  close(): void {
    if (this.isEditing) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.showAddCoachForm = false;
    this.error = null;
    this.closed.emit();
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
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
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
          } else if (error.status === 404) {
          } else {
            this.error =
              'Грешка при зареждане на треньорите. Моля, опитайте отново.';
          }
          return of({ content: [] });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.coaches = response.content || [];
          this.loadingCoaches = false;
          this.error = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.coaches = [];
          this.loadingCoaches = false;
          this.cdr.markForCheck();
        },
      });
  }

  getCoachName(coach: ClubCoachDto | null): string {
    if (!coach) return '';
    
    if (coach.coach) {
      const firstName = coach.coach.firstName || '';
      const lastName = coach.coach.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || '-';
    }
    
    return '-';
  }

  getCoachStatus(coach: ClubCoachDto): string {
    return coach.coach?.isActive ? 'Активен' : 'Неактивен';
  }

  getCoachStatusClass(coach: ClubCoachDto): string {
    return coach.coach?.isActive ? 'text-green-600' : 'text-red-600';
  }

  openAddCoachForm(): void {
    this.showAddCoachForm = true;
    this.loadAvailableCoaches();
    this.cdr.markForCheck();
  }

  closeAddCoachForm(): void {
    this.showAddCoachForm = false;
    this.selectedCoachId = '';
    this.availableCoaches = [];
    this.coachOptions = [];
    this.cdr.markForCheck();
  }

  private loadAvailableCoaches(): void {
    this.loadingCoachesForAdd = true;
    this.cdr.markForCheck();

    forkJoin({
      coaches: this.usersService.getAllUsers("role eq 'COACH'", undefined, undefined, 1000, 0),
      allClubs: this.clubsService.getAllClubs(undefined, undefined, undefined, 1000, 0, undefined)
    }).pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, error: HttpErrorResponse) => {
            if (
              error.status === 401 ||
              error.status === 403 ||
              error.status === 404
            ) {
              throw error;
            }
            if (retryCount >= 2) {
              throw error;
            }
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
        }
        return of({ coaches: { content: [] }, allClubs: { content: [] } });
      }),
      takeUntil(this.destroy$),
    )
    .subscribe({
      next: ({ coaches, allClubs }) => {
        const availableCoaches = coaches.content || [];
        const clubs = allClubs.content || [];
        
        const clubCoachRequests = clubs
          .filter((club: ClubDto) => club.uuid)
          .map((club: ClubDto) => 
            this.clubCoachesService.getClubCoaches(club.uuid!, undefined, undefined, 1000, 0, undefined).pipe(
              catchError(() => of({ content: [] })),
            )
          );
        
        if (clubCoachRequests.length === 0) {
          this.processCoachOptions(availableCoaches);
          return;
        }
        
        forkJoin(clubCoachRequests).pipe(
          catchError(() => of([])),
          takeUntil(this.destroy$),
        ).subscribe({
          next: (clubCoachesResponses) => {
            const assignedCoachIds = new Set<string>();
            clubCoachesResponses.forEach((response: any) => {
              (response.content || []).forEach((clubCoach: ClubCoachDto) => {
                if (clubCoach.userId) {
                  assignedCoachIds.add(clubCoach.userId);
                }
              });
            });
            
            this.coachOptions = availableCoaches.map(coach => ({
              value: coach.uuid || '',
              label: this.getCoachDisplayName(coach),
              disabled: coach.uuid ? assignedCoachIds.has(coach.uuid) : false
            }));

            this.availableCoaches = availableCoaches;
            this.loadingCoachesForAdd = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.processCoachOptions(availableCoaches);
          }
        });
      },
      error: () => {
        this.availableCoaches = [];
        this.coachOptions = [];
        this.loadingCoachesForAdd = false;
        this.cdr.markForCheck();
      },
    });
  }

  private processCoachOptions(availableCoaches: UserDto[]): void {
    const assignedCoachIds = new Set<string>();
    this.coaches.forEach((c) => {
      if (c.userId) {
        assignedCoachIds.add(c.userId);
      }
    });
    
    this.coachOptions = availableCoaches.map(coach => ({
      value: coach.uuid || '',
      label: this.getCoachDisplayName(coach),
      disabled: coach.uuid ? assignedCoachIds.has(coach.uuid) : false
    }));

    this.availableCoaches = availableCoaches;
    this.loadingCoachesForAdd = false;
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
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404 ||
                error.status === 409
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при добавяне на треньор';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 409) {
            errorMessage =
              err?.error?.message || 'Треньорът вече е добавен към клуба.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
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
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при премахване на треньор';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Треньорът не е намерен.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
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
    this.loadAdminsForEdit();
    this.cdr.markForCheck();
  }

  private loadAdminsForEdit(): void {
    this.loadingAdmins = true;
    this.cdr.markForCheck();

    forkJoin({
      admins: this.usersService.getAllUsers("role eq 'CLUB_ADMIN'", undefined, undefined, 1000, 0),
      clubs: this.clubsService.getAllClubs(undefined, undefined, undefined, 1000, 0, undefined)
    }).pipe(
      catchError(() => {
        return of({ admins: { content: [] }, clubs: { content: [] } });
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: ({ admins, clubs }) => {
        const availableAdmins = admins.content || [];
        
        this.assignedAdminIds = new Set();
        (clubs.content || []).forEach((club: ClubDto) => {
          if (club.clubAdminId && club.uuid !== this.club?.uuid) {
            this.assignedAdminIds.add(club.clubAdminId);
          }
        });

        this.adminOptions = availableAdmins.map(admin => ({
          value: admin.uuid || '',
          label: this.getAdminDisplayName(admin),
          disabled: admin.uuid ? this.assignedAdminIds.has(admin.uuid) : false
        }));

        this.loadingAdmins = false;
        this.cdr.markForCheck();
      },
      error: () => {
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
              if (
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404 ||
                error.status === 409
              ) {
                throw error;
              }
              if (retryCount >= 2) {
                throw error;
              }
              return retryCount + 1;
            }, 0),
            delay(1000),
          ),
        ),
        catchError((err: HttpErrorResponse) => {
          let errorMessage = 'Грешка при запазване';
          if (err.status === 401) {
            errorMessage = 'Сесията ви е изтекла. Моля, опитайте отново.';
          } else if (err.status === 403) {
            errorMessage = 'Нямате права за тази операция.';
          } else if (err.status === 404) {
            errorMessage = 'Клубът не е намерен.';
          } else if (err.status === 409) {
            errorMessage =
              err?.error?.message ||
              'Конфликт при запазване. Моля, опитайте отново.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          }
          return throwError(() => ({ message: errorMessage }));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updatedClub) => {
          if (updatedClub) {
            this.club = updatedClub;
          }
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

  private resetState(): void {
    this.isEditing = false;
    this.showAddCoachForm = false;
    this.error = null;
    this.saving = false;
    this.coaches = [];
    this.availableCoaches = [];
    this.coachOptions = [];
    this.selectedCoachId = '';
    this.adminOptions = [];
    this.assignedAdminIds = new Set();
    this.loadingAdmins = false;
    this.showRemoveCoachConfirm = false;
    this.coachToRemove = null;
    this.loadingCoachesForAdd = false;
  }

  getCoachDisplayName(coach: UserDto): string {
    return (
      `${coach.firstName || ''} ${coach.lastName || ''}`.trim() ||
      coach.username ||
      '-'
    );
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
}
