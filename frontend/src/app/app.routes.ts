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
    path: 'competition-groups',
    loadComponent: () =>
      import('./features/competition-groups/competition-groups.component').then(
        (m) => m.CompetitionGroupsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'disciplines',
    loadComponent: () =>
      import('./features/disciplines/disciplines.component').then(
        (m) => m.DisciplinesComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'scoring',
    loadComponent: () =>
      import('./features/scoring/scoring.component').then(
        (m) => m.ScoringComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'qualification',
    loadComponent: () =>
      import('./features/qualification/qualification.component').then(
        (m) => m.QualificationComponent,
      ),
    canActivate: [AuthGuard],
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
  // Fallback
  { path: '**', redirectTo: '/' },
];
