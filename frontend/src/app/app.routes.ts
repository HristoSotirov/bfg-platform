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
    path: 'clubs/:uuid/:tab',
    loadComponent: () =>
      import('./features/clubs/pages/club-detail-page/club-detail-page.component').then(
        (m) => m.ClubDetailPageComponent,
      ),
  },
  {
    path: 'clubs/:uuid',
    redirectTo: 'clubs/:uuid/details',
    pathMatch: 'full',
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
    path: 'accreditations/:uuid/:tab',
    loadComponent: () =>
      import('./features/accreditations/pages/accreditation-detail-page/accreditation-detail-page.component').then(
        (m) => m.AccreditationDetailPageComponent,
      ),
  },
  {
    path: 'accreditations/:uuid',
    redirectTo: 'accreditations/:uuid/details',
    pathMatch: 'full',
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
    path: 'users/:uuid/:tab',
    loadComponent: () =>
      import('./features/users/pages/user-detail-page/user-detail-page.component').then(
        (m) => m.UserDetailPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'users/:uuid',
    redirectTo: 'users/:uuid/details',
    pathMatch: 'full',
  },
  {
    path: 'regulations',
    loadComponent: () =>
      import('./features/rules/rules.component').then((m) => m.RulesComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/:tab',
    loadComponent: () =>
      import('./features/rules/rules.component').then((m) => m.RulesComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/groups/:uuid/:tab',
    loadComponent: () =>
      import('./features/rules/pages/competition-group-detail-page/competition-group-detail-page.component').then(
        (m) => m.CompetitionGroupDetailPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/groups/:uuid',
    redirectTo: 'regulations/groups/:uuid/details',
    pathMatch: 'full',
  },
  {
    path: 'regulations/disciplines/:uuid/:tab',
    loadComponent: () =>
      import('./features/rules/pages/discipline-detail-page/discipline-detail-page.component').then(
        (m) => m.DisciplineDetailPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/disciplines/:uuid',
    redirectTo: 'regulations/disciplines/:uuid/details',
    pathMatch: 'full',
  },
  {
    path: 'regulations/scoring/:uuid/:tab',
    loadComponent: () =>
      import('./features/rules/pages/scoring-detail-page/scoring-detail-page.component').then(
        (m) => m.ScoringDetailPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/scoring/:uuid',
    redirectTo: 'regulations/scoring/:uuid/details',
    pathMatch: 'full',
  },
  {
    path: 'regulations/qualification/:uuid/:tab',
    loadComponent: () =>
      import('./features/rules/pages/qualification-detail-page/qualification-detail-page.component').then(
        (m) => m.QualificationDetailPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'regulations/qualification/:uuid',
    redirectTo: 'regulations/qualification/:uuid/details',
    pathMatch: 'full',
  },
  {
    path: 'competitions',
    loadComponent: () =>
      import('./features/competitions/competitions.component').then(
        (m) => m.CompetitionsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'competitions/:uuid',
    loadComponent: () =>
      import('./features/competitions/components/competition-details-page/competition-details-page.component').then(
        (m) => m.CompetitionDetailsPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'competitions/:uuid/:tab',
    loadComponent: () =>
      import('./features/competitions/components/competition-details-page/competition-details-page.component').then(
        (m) => m.CompetitionDetailsPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'athletes/:uuid/:tab',
    loadComponent: () =>
      import('./features/accreditations/pages/athlete-detail-page/athlete-detail-page.component').then(
        (m) => m.AthleteDetailPageComponent,
      ),
  },
  {
    path: 'athletes/:uuid',
    redirectTo: 'athletes/:uuid/details',
    pathMatch: 'full',
  },
  // Fallback
  { path: '**', redirectTo: '/' },
];
