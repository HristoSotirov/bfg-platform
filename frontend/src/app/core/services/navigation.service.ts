import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavigationItem } from '../models/navigation.model';
import { SystemRole } from '../models/navigation.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private navigationItems: NavigationItem[] = [
    {
      id: 'accreditations',
      label: '',
      route: '/accreditations',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE'],
    },
    {
      id: 'clubs',
      label: '',
      route: '/clubs',
      requiredRoles: [], // visible to all
    },
    {
      id: 'users',
      label: '',
      route: '/users',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'UMPIRE'],
    },
    {
      id: 'rules',
      label: '',
      route: '/regulations',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE'],
    },
    {
      id: 'competitions',
      label: '',
      route: '/competitions',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH', 'UMPIRE'],
    },
    {
      id: 'results',
      label: '',
      route: '/results',
      requiredRoles: [], // visible to all
    },
    {
      id: 'system',
      label: '',
      route: '/system',
      requiredRoles: ['APP_ADMIN'],
    },
  ];

  constructor(private translateService: TranslateService) {
    this.updateLabels();
    this.translateService.onLangChange.subscribe(() => {
      this.updateLabels();
    });
  }

  private updateLabels(): void {
    const labelKeys: Record<string, string> = {
      accreditations: 'nav.accreditations',
      clubs: 'nav.clubs',
      users: 'nav.users',
      rules: 'nav.rules',
      competitions: 'nav.competitions',
      results: 'nav.results',
      system: 'nav.system',
    };

    this.navigationItems.forEach((item) => {
      const key = labelKeys[item.id];
      if (key) {
        item.label = this.translateService.instant(key);
      }
    });
  }

  getVisibleItems(userRoles: SystemRole[]): NavigationItem[] {
    return this.navigationItems.filter((item) =>
      this.hasAccess(item, userRoles),
    );
  }

  private hasAccess(item: NavigationItem, userRoles: SystemRole[]): boolean {
    if (item.requiredRoles.length === 0) return true;
    return item.requiredRoles.some((role) =>
      userRoles.includes(role as SystemRole),
    );
  }

  getAllItems(): NavigationItem[] {
    return [...this.navigationItems];
  }

  getGuestItems(): NavigationItem[] {
    return [];
  }
}
