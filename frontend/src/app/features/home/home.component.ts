import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HeaderComponent } from '../../layout/header/header.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { NavigationService } from '../../core/services/navigation.service';
import { AuthService } from '../../core/services/auth.service';
import { NavigationItem } from '../../core/models/navigation.model';
import { NewsSectionComponent } from './components/news-section/news-section.component';
import { CalendarSectionComponent } from './components/calendar-section/calendar-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    CardComponent,
    NewsSectionComponent,
    CalendarSectionComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  visibleItems: NavigationItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      this.updateNavigationItems();
    });

    this.updateNavigationItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCardBorderClass(item: NavigationItem): string {
    if (item.id === 'clubs') return 'border-bfg-teal';
    if (item.id === 'users') return 'border-bfg-blue';
    return 'border-bfg-blue';
  }

  private updateNavigationItems(): void {
    if (this.isAuthenticated) {
      const userRoles = this.authService.getCurrentUserRoles();
      this.visibleItems = this.navigationService.getVisibleItems(userRoles);
    } else {
      this.visibleItems = this.navigationService.getGuestItems();
    }
  }
}
