import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },

  // Public pages (view only for guests)
  {
    path: 'clubs',
    loadComponent: () =>
      import('./features/clubs/clubs.component').then((m) => m.ClubsComponent),
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./features/coming-soon/coming-soon.component').then(
        (m) => m.ComingSoonComponent,
      ),
  },

  // Protected pages (require authentication)
  {
    path: 'accreditations',
    loadComponent: () =>
      import('./features/accreditations/accreditations.component').then(
        (m) => m.AccreditationsComponent,
      ),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./features/users/users.component').then(
        (m) => m.UsersComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'competitions',
    loadComponent: () =>
      import('./features/coming-soon/coming-soon.component').then(
        (m) => m.ComingSoonComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations',
    loadComponent: () =>
      import('./features/coming-soon/coming-soon.component').then(
        (m) => m.ComingSoonComponent,
      ),
    canActivate: [AuthGuard],
  },

  // Fallback
  { path: '**', redirectTo: '/' },
];
