import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, AppLanguage } from '../../core/services/language.service';
import { User } from '../../core/models/user.model';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { Observable, forkJoin, of, catchError } from 'rxjs';
import {
  UsersService,
  ClubsService,
  ClubCoachesService,
  UserDto,
  ClubDto,
} from '../../core/services/api';

interface ProfileData {
  user: UserDto | null;
  club: ClubDto | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, DialogComponent, SearchableSelectDropdownComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  currentUser$: Observable<User | null>;
  isProfileDialogOpen = false;
  currentUserDetails: UserDto | null = null;
  isMobileMenuOpen = false;
  isLogoutConfirmOpen = false;

  profileData: ProfileData = {
    user: null,
    club: null,
    loading: false,
    error: null,
  };

  readonly languageOptions: SearchableSelectOption[] = [
    { value: 'bg', label: 'Български' },
    { value: 'en', label: 'English' },
  ];

  private roleLabels: Record<string, string> = {
    APP_ADMIN: 'Администратор',
    FEDERATION_ADMIN: 'Администратор на федерацията',
    CLUB_ADMIN: 'Администратор на клуб',
    COACH: 'Треньор',
  };

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private languageService: LanguageService,
  ) {
    this.currentUser$ = this.authService.currentUser$;

    // Load current user details when user is available
    this.currentUser$.subscribe((user) => {
      if (user?.uuid) {
        this.loadCurrentUserDetails(user.uuid);
      } else {
        this.currentUserDetails = null;
        this.cdr.markForCheck();
      }
    });
  }

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage;
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
    this.cdr.markForCheck();
  }

  private loadCurrentUserDetails(uuid: string): void {
    this.usersService.getUserByUuid(uuid).subscribe({
      next: (userDetails) => {
        this.currentUserDetails = userDetails;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load user details:', err);
        this.currentUserDetails = null;
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
    this.isLogoutConfirmOpen = false;
    this.isMobileMenuOpen = false;
    this.authService.logout();
  }

  confirmLogout(): void {
    this.isLogoutConfirmOpen = true;
  }

  closeLogoutConfirm(): void {
    this.isLogoutConfirmOpen = false;
  }

  openProfileDialog(): void {
    this.isProfileDialogOpen = true;
    this.loadProfileData();
  }

  closeProfileDialog(): void {
    this.isProfileDialogOpen = false;
    this.profileData = { user: null, club: null, loading: false, error: null };
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isMobileMenuOpen) {
      const clickedInside = this.elementRef.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.isMobileMenuOpen = false;
        this.cdr.markForCheck();
      }
    }
  }

  private loadProfileData(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser?.uuid) {
      return;
    }

    this.profileData = { user: null, club: null, loading: true, error: null };
    this.cdr.markForCheck();

    // Fetch user data
    this.usersService.getUserByUuid(currentUser.uuid).subscribe({
      next: (user) => {
        this.profileData.user = user;
        this.profileData.loading = false;

        // For COACH or CLUB_ADMIN, also fetch club info
        const role = user.role;
        if (role === 'COACH') {
          this.loadCoachClub(currentUser.uuid);
        } else if (role === 'CLUB_ADMIN') {
          this.loadAdminClub(currentUser.uuid);
        } else {
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.profileData.loading = false;
        this.profileData.error = 'Грешка при зареждане на профила';
        this.cdr.markForCheck();
      },
    });
  }

  private loadCoachClub(userId: string): void {
    this.clubCoachesService.getClubByCoachId(userId).subscribe({
      next: (club) => {
        this.profileData.club = club || null;
        this.cdr.markForCheck();
      },
      error: () => {
        // No club found or error - that's ok
        this.profileData.club = null;
        this.cdr.markForCheck();
      },
    });
  }

  private loadAdminClub(userId: string): void {
    this.clubsService.getClubByAdminId(userId).subscribe({
      next: (club) => {
        this.profileData.club = club || null;
        this.cdr.markForCheck();
      },
      error: () => {
        // No club found or error - that's ok
        this.profileData.club = null;
        this.cdr.markForCheck();
      },
    });
  }

  getUserName(user: User): string {
    if (this.currentUserDetails) {
      const fullName =
        `${this.currentUserDetails.firstName || ''} ${this.currentUserDetails.lastName || ''}`.trim();
      return (
        fullName || this.currentUserDetails.username || user.username || '-'
      );
    }
    return user.username || '-';
  }

  getUserRole(user: User): string {
    const role = user.roles && user.roles.length > 0 ? user.roles[0] : '';
    return this.roleLabels[role] || role;
  }

  getRoleLabel(role: string | undefined): string {
    if (!role) return '-';
    return this.roleLabels[role] || role;
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

  shouldShowClubSection(): boolean {
    const role = this.profileData.user?.role;
    return role === 'COACH' || role === 'CLUB_ADMIN';
  }
}
