import { Injectable } from '@angular/core';
import { NavigationItem } from '../models/navigation.model';
import { SystemRole } from '../models/navigation.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private navigationItems: NavigationItem[] = [
    {
      id: 'accreditations',
      label: 'Картотеки',
      route: '/accreditations',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH'],
    },
    {
      id: 'clubs',
      label: 'Клубове',
      route: '/clubs',
      requiredRoles: [], // visible to all
    },
    {
      id: 'users',
      label: 'Потребители',
      route: '/users',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN'],
    },
    {
      id: 'rules',
      label: 'Правилник',
      route: '/regulations',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN', 'CLUB_ADMIN', 'COACH'],
    },
    {
      id: 'competitions',
      label: 'Състезания',
      route: '/competitions',
      requiredRoles: ['APP_ADMIN', 'FEDERATION_ADMIN'],
    },
    {
      id: 'results',
      label: 'Резултати',
      route: '/results',
      requiredRoles: [], // visible to all
    },
  ];

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
