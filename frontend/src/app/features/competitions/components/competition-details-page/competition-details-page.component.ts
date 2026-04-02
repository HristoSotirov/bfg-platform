import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CompetitionsService,
  CompetitionDto,
  CompetitionRequest,
  CompetitionStatus,
  CompetitionDisciplineSchemeDto,
  CompetitionDisciplineSchemesService,
  CompetitionDisciplineSchemeRequest,
  CompetitionTimetableEventDto,
  CompetitionTimetableEventRequest,
  CompetitionTimetableEventsService,
  ScoringSchemesService,
  ScoringSchemeDto,
  ScoringRuleDto,
  ScoringRulesService,
  QualificationSchemesService,
  QualificationSchemeDto,
  QualificationTiersService,
  QualificationTierDto,
  DisciplineDefinitionsService,
  DisciplineDefinitionDto,
  QualificationEventType,
  CompetitionEventStatus,
} from '../../../../core/services/api';
import { SystemRole } from '../../../../core/models/navigation.model';

type Tab = 'details' | 'disciplines' | 'timetable' | 'entries' | 'progression' | 'results';

@Component({
  selector: 'app-competition-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
  ],
  templateUrl: './competition-details-page.component.html',
  styleUrl: './competition-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionDetailsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  competition: CompetitionDto | null = null;
  loading = true;
  error: string | null = null;

  activeTab: Tab = 'details';

  // Edit mode
  isEditing = false;
  saving = false;
  editError: string | null = null;
  editData: Partial<CompetitionRequest> = {};

  // Scoring scheme data
  scoringScheme: ScoringSchemeDto | null = null;
  scoringRules: ScoringRuleDto[] = [];
  loadingScoring = false;

  // Qualification scheme data
  qualificationScheme: QualificationSchemeDto | null = null;
  qualificationTiers: QualificationTierDto[] = [];
  loadingQualification = false;

  // Disciplines
  disciplineSchemes: CompetitionDisciplineSchemeDto[] = [];
  disciplineDetails: Map<string, DisciplineDefinitionDto> = new Map();
  loadingDisciplines = false;
  allDisciplines: DisciplineDefinitionDto[] = [];
  disciplineOptions: SearchableSelectOption[] = [];
  newDisciplineId = '';
  addingDiscipline = false;
  addDisciplineError: string | null = null;
  showDeleteDisciplineConfirm = false;
  disciplineToDelete: CompetitionDisciplineSchemeDto | null = null;

  // Timetable
  timetableEvents: CompetitionTimetableEventDto[] = [];
  loadingTimetable = false;

  // Add timetable event
  showAddTimetableEvent = false;
  savingTimetable = false;
  timetableError: string | null = null;
  newEvent: Partial<CompetitionTimetableEventRequest> = {};
  showDeleteTimetableConfirm = false;
  timetableEventToDelete: CompetitionTimetableEventDto | null = null;

  readonly eventTypeOptions: SearchableSelectOption[] = [
    { value: QualificationEventType.H, label: 'Серия' },
    { value: QualificationEventType.Sf, label: 'Полуфинал' },
    { value: QualificationEventType.Fb, label: 'Финал Б' },
    { value: QualificationEventType.Fa, label: 'Финал А' },
  ];

  readonly eventStatusOptions: SearchableSelectOption[] = [
    { value: CompetitionEventStatus.Scheduled, label: 'Насрочено' },
    { value: CompetitionEventStatus.InProgress, label: 'В ход' },
    { value: CompetitionEventStatus.Finished, label: 'Приключило' },
    { value: CompetitionEventStatus.Cancelled, label: 'Отменено' },
    { value: CompetitionEventStatus.Postponed, label: 'Отложено' },
  ];

  // Option lists for editing
  scoringSchemeOptions: SearchableSelectOption[] = [];
  qualificationSchemeOptions: SearchableSelectOption[] = [];
  allScoringSchemes: ScoringSchemeDto[] = [];
  allQualificationSchemes: QualificationSchemeDto[] = [];

  userRole: SystemRole | null = null;

  readonly statusOptions: SearchableSelectOption[] = [
    { value: CompetitionStatus.Draft, label: 'Чернова' },
    { value: CompetitionStatus.Planned, label: 'Планирано' },
    { value: CompetitionStatus.RegistrationOpen, label: 'Регистрация' },
    { value: CompetitionStatus.RegistrationClosed, label: 'Затворена регистрация' },
    { value: CompetitionStatus.InProgress, label: 'В ход' },
    { value: CompetitionStatus.Completed, label: 'Приключило' },
    { value: CompetitionStatus.Cancelled, label: 'Отменено' },
  ];

  readonly scopeTypeOptions: SearchableSelectOption[] = [
    { value: 'INTERNAL', label: 'Вътрешен' },
    { value: 'EXTERNAL', label: 'Международен' },
    { value: 'NATIONAL', label: 'Национален' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private competitionsService: CompetitionsService,
    private disciplineSchemesService: CompetitionDisciplineSchemesService,
    private timetableEventsService: CompetitionTimetableEventsService,
    private scoringSchemesService: ScoringSchemesService,
    private scoringRulesService: ScoringRulesService,
    private qualificationSchemesService: QualificationSchemesService,
    private qualificationTiersService: QualificationTiersService,
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.loadCompetition(uuid);
      }
    });

    this.loadSchemeLists();
    this.loadAllDisciplines();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return this.userRole === 'APP_ADMIN' || this.userRole === 'FEDERATION_ADMIN';
  }

  get tabs(): { id: Tab; label: string; available: boolean }[] {
    const isReal = !this.competition?.isTemplate;
    return [
      { id: 'details', label: 'Детайли', available: true },
      { id: 'disciplines', label: 'Дисциплини', available: true },
      { id: 'timetable', label: 'Разписание', available: true },
      { id: 'entries', label: 'Заявки', available: isReal },
      { id: 'progression', label: 'Стартова листа', available: isReal },
      { id: 'results', label: 'Резултати', available: isReal },
    ];
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    if (tab === 'disciplines' && this.disciplineSchemes.length === 0 && !this.loadingDisciplines) {
      this.loadDisciplines();
    }
    if (tab === 'timetable' && this.timetableEvents.length === 0 && !this.loadingTimetable) {
      this.loadTimetable();
    }
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.router.navigate(['/competitions']);
  }

  // ===== LOAD =====

  private loadCompetition(uuid: string): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.competitionsService
      .getCompetitionByUuid(uuid)
      .pipe(
        catchError((err) => {
          this.error = err?.error?.message || 'Грешка при зареждане на данните';
          this.loading = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((competition) => {
        this.competition = competition;
        this.loading = false;
        if (competition) {
          this.loadScoringSchemeData(competition.scoringSchemeId);
          this.loadQualificationSchemeData(competition.qualificationSchemeId);
          this.loadDisciplines();
        }
        this.cdr.markForCheck();
      });
  }

  private loadScoringSchemeData(schemeId: string | undefined): void {
    if (!schemeId) return;
    this.loadingScoring = true;
    this.cdr.markForCheck();

    forkJoin({
      scheme: this.scoringSchemesService.getScoringSchemeByUuid(schemeId),
      rules: this.scoringRulesService.getAllScoringRules(
        `scoringSchemeId eq '${schemeId}'`,
        ['placement_asc'] as any,
        100,
        0,
      ),
    })
      .pipe(
        catchError(() => of({ scheme: null, rules: { content: [] } })),
        takeUntil(this.destroy$),
      )
      .subscribe((result: any) => {
        this.scoringScheme = result.scheme;
        this.scoringRules = result.rules?.content || [];
        this.loadingScoring = false;
        this.cdr.markForCheck();
      });
  }

  private loadQualificationSchemeData(schemeId: string | undefined): void {
    if (!schemeId) return;
    this.loadingQualification = true;
    this.cdr.markForCheck();

    forkJoin({
      scheme: this.qualificationSchemesService.getQualificationSchemeByUuid(schemeId),
      tiers: this.qualificationTiersService.getAllQualificationTiers(
        `qualificationSchemeId eq '${schemeId}'`,
        ['boatCountMin_asc'] as any,
        200,
        0,
      ),
    })
      .pipe(
        catchError(() => of({ scheme: null, tiers: { content: [] } })),
        takeUntil(this.destroy$),
      )
      .subscribe((result: any) => {
        this.qualificationScheme = result.scheme;
        this.qualificationTiers = result.tiers?.content || [];
        this.loadingQualification = false;
        this.cdr.markForCheck();
      });
  }

  loadDisciplines(): void {
    if (!this.competition?.uuid) return;
    this.loadingDisciplines = true;
    this.cdr.markForCheck();

    this.disciplineSchemesService
      .getAllCompetitionDisciplineSchemes(
        `competitionId eq '${this.competition.uuid}'`,
        100,
        0,
      )
      .pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((resp: any) => {
        this.disciplineSchemes = resp.content || [];
        // Load details for each discipline
        const ids = this.disciplineSchemes
          .map((ds) => ds.disciplineId)
          .filter((id): id is string => !!id);
        ids.forEach((id) => {
          if (!this.disciplineDetails.has(id)) {
            this.disciplineDefinitionsService
              .getDisciplineDefinitionByUuid(id)
              .pipe(takeUntil(this.destroy$))
              .subscribe((d) => {
                this.disciplineDetails.set(id, d);
                this.cdr.markForCheck();
              });
          }
        });
        this.loadingDisciplines = false;
        this.cdr.markForCheck();
      });
  }

  loadTimetable(): void {
    if (!this.competition?.uuid) return;
    this.loadingTimetable = true;
    this.cdr.markForCheck();

    this.timetableEventsService
      .getAllCompetitionTimetableEvents(
        `competitionId eq '${this.competition.uuid}'`,
        ['eventNumber_asc'] as any,
        200,
        0,
      )
      .pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((resp: any) => {
        this.timetableEvents = resp.content || [];
        this.loadingTimetable = false;
        this.cdr.markForCheck();
      });
  }

  private loadSchemeLists(): void {
    this.scoringSchemesService
      .getAllScoringSchemes('isActive eq true', undefined, ['name_asc'] as any, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe((resp: any) => {
        this.allScoringSchemes = resp.content || [];
        this.scoringSchemeOptions = this.allScoringSchemes.map((s) => ({
          value: s.uuid || '',
          label: s.name || '',
        }));
        this.cdr.markForCheck();
      });

    this.qualificationSchemesService
      .getAllQualificationSchemes('isActive eq true', undefined, ['name_asc'] as any, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe((resp: any) => {
        this.allQualificationSchemes = resp.content || [];
        this.qualificationSchemeOptions = this.allQualificationSchemes.map((s) => ({
          value: s.uuid || '',
          label: s.name || '',
        }));
        this.cdr.markForCheck();
      });
  }

  private loadAllDisciplines(): void {
    this.disciplineDefinitionsService
      .getAllDisciplineDefinitions('isActive eq true', undefined, ['name_asc'] as any, 500, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe((resp: any) => {
        this.allDisciplines = resp.content || [];
        this.disciplineOptions = this.allDisciplines.map((d) => ({
          value: d.uuid || '',
          label: d.name || '',
        }));
        this.cdr.markForCheck();
      });
  }

  // ===== EDIT COMPETITION =====

  startEditing(): void {
    if (!this.competition) return;
    this.editData = {
      isTemplate: this.competition.isTemplate,
      shortName: this.competition.shortName,
      name: this.competition.name,
      durationDays: this.competition.durationDays || undefined,
      season: this.competition.season,
      location: this.competition.location,
      startDate: this.competition.startDate,
      endDate: this.competition.endDate,
      status: this.competition.status as CompetitionStatus,
      scopeType: this.competition.scopeType as any,
      scoringSchemeId: this.competition.scoringSchemeId,
      qualificationSchemeId: this.competition.qualificationSchemeId,
    };
    this.isEditing = true;
    this.editError = null;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.editError = null;
    this.cdr.markForCheck();
  }

  saveEditing(): void {
    if (!this.competition?.uuid) return;
    this.saving = true;
    this.editError = null;
    this.cdr.markForCheck();

    this.competitionsService
      .updateCompetitionByUuid(this.competition.uuid, this.editData as CompetitionRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.competition = updated;
          this.isEditing = false;
          this.saving = false;
          // Reload related data if scheme changed
          this.loadScoringSchemeData(updated.scoringSchemeId);
          this.loadQualificationSchemeData(updated.qualificationSchemeId);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.editError = err?.error?.message || 'Грешка при записване';
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ===== DISCIPLINES TAB =====

  get availableDisciplineOptions(): SearchableSelectOption[] {
    const assigned = new Set(this.disciplineSchemes.map((ds) => ds.disciplineId));
    return this.disciplineOptions.filter((o) => !assigned.has(o.value));
  }

  addDiscipline(): void {
    if (!this.competition?.uuid || !this.newDisciplineId) return;
    this.addingDiscipline = true;
    this.addDisciplineError = null;
    this.cdr.markForCheck();

    const request: CompetitionDisciplineSchemeRequest = {
      competitionId: this.competition.uuid,
      disciplineId: this.newDisciplineId,
    };

    this.disciplineSchemesService
      .createCompetitionDisciplineScheme(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.newDisciplineId = '';
          this.addingDiscipline = false;
          this.loadDisciplines();
        },
        error: (err) => {
          this.addDisciplineError = err?.error?.message || 'Грешка при добавяне';
          this.addingDiscipline = false;
          this.cdr.markForCheck();
        },
      });
  }

  confirmDeleteDiscipline(ds: CompetitionDisciplineSchemeDto): void {
    this.disciplineToDelete = ds;
    this.showDeleteDisciplineConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDeleteDiscipline(): void {
    this.disciplineToDelete = null;
    this.showDeleteDisciplineConfirm = false;
    this.cdr.markForCheck();
  }

  deleteDiscipline(): void {
    if (!this.disciplineToDelete?.uuid) return;
    this.disciplineSchemesService
      .deleteCompetitionDisciplineSchemeByUuid(this.disciplineToDelete.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.disciplineToDelete = null;
          this.showDeleteDisciplineConfirm = false;
          this.loadDisciplines();
        },
        error: (err) => {
          this.addDisciplineError = err?.error?.message || 'Грешка при изтриване';
          this.disciplineToDelete = null;
          this.showDeleteDisciplineConfirm = false;
          this.cdr.markForCheck();
        },
      });
  }

  getDisciplineName(disciplineId: string | undefined): string {
    if (!disciplineId) return '-';
    return this.disciplineDetails.get(disciplineId)?.name || disciplineId;
  }

  getDisciplineShortName(disciplineId: string | undefined): string {
    if (!disciplineId) return '-';
    return this.disciplineDetails.get(disciplineId)?.shortName || '-';
  }

  getDisciplineBoatClass(disciplineId: string | undefined): string {
    if (!disciplineId) return '-';
    return this.disciplineDetails.get(disciplineId)?.boatClass || '-';
  }

  // ===== TIMETABLE TAB =====

  get disciplineOptionsForTimetable(): SearchableSelectOption[] {
    return this.disciplineSchemes.map((ds) => ({
      value: ds.disciplineId || '',
      label: this.getDisciplineName(ds.disciplineId),
    }));
  }

  openAddTimetableEvent(): void {
    const nextNumber = (this.timetableEvents.length > 0
      ? Math.max(...this.timetableEvents.map((e) => e.eventNumber ?? 0)) + 1
      : 1);
    this.newEvent = {
      competitionId: this.competition?.uuid,
      eventNumber: nextNumber,
      qualificationEventType: QualificationEventType.H,
      qualificationStageNumber: 1,
      dayOffset: 0,
      plannedTime: '09:00',
      eventStatus: CompetitionEventStatus.Scheduled,
    };
    this.showAddTimetableEvent = true;
    this.timetableError = null;
    this.cdr.markForCheck();
  }

  cancelAddTimetableEvent(): void {
    this.showAddTimetableEvent = false;
    this.newEvent = {};
    this.timetableError = null;
    this.cdr.markForCheck();
  }

  saveAddTimetableEvent(): void {
    if (!this.competition?.uuid || !this.newEvent.disciplineId || !this.newEvent.qualificationEventType) return;
    this.savingTimetable = true;
    this.timetableError = null;
    this.cdr.markForCheck();

    this.timetableEventsService
      .createCompetitionTimetableEvent(this.newEvent as CompetitionTimetableEventRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showAddTimetableEvent = false;
          this.newEvent = {};
          this.savingTimetable = false;
          this.loadTimetable();
        },
        error: (err) => {
          this.timetableError = err?.error?.message || 'Грешка при запис';
          this.savingTimetable = false;
          this.cdr.markForCheck();
        },
      });
  }

  confirmDeleteTimetableEvent(event: CompetitionTimetableEventDto): void {
    this.timetableEventToDelete = event;
    this.showDeleteTimetableConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDeleteTimetableEvent(): void {
    this.timetableEventToDelete = null;
    this.showDeleteTimetableConfirm = false;
    this.cdr.markForCheck();
  }

  deleteTimetableEvent(): void {
    if (!this.timetableEventToDelete?.uuid) return;
    this.timetableEventsService
      .deleteCompetitionTimetableEventByUuid(this.timetableEventToDelete.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.timetableEventToDelete = null;
          this.showDeleteTimetableConfirm = false;
          this.loadTimetable();
        },
        error: (err) => {
          this.timetableError = err?.error?.message || 'Грешка при изтриване';
          this.timetableEventToDelete = null;
          this.showDeleteTimetableConfirm = false;
          this.cdr.markForCheck();
        },
      });
  }

  getEventTypLabel(type: string | undefined): string {
    const labels: Record<string, string> = {
      H: 'Серия',
      SF: 'Полуфинал',
      FB: 'Финал Б',
      FA: 'Финал А',
    };
    return type ? (labels[type] ?? type) : '-';
  }

  getEventStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Насрочено',
      IN_PROGRESS: 'В ход',
      FINISHED: 'Приключило',
      CANCELLED: 'Отменено',
      POSTPONED: 'Отложено',
    };
    return status ? (labels[status] ?? status) : '-';
  }

  // ===== FORMATTING =====

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('bg-BG');
    } catch {
      return dateStr;
    }
  }

  getStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      DRAFT: 'Чернова',
      PLANNED: 'Планирано',
      REGISTRATION_OPEN: 'Регистрация',
      REGISTRATION_CLOSED: 'Затворена регистрация',
      IN_PROGRESS: 'В ход',
      COMPLETED: 'Приключило',
      CANCELLED: 'Отменено',
    };
    return status ? (labels[status] ?? status) : '-';
  }

  getStatusClass(status: string | undefined): string {
    const classes: Record<string, string> = {
      DRAFT: 'text-gray-500',
      PLANNED: 'text-blue-600',
      REGISTRATION_OPEN: 'text-green-600',
      REGISTRATION_CLOSED: 'text-orange-500',
      IN_PROGRESS: 'text-bfg-blue font-semibold',
      COMPLETED: 'text-gray-700',
      CANCELLED: 'text-red-600',
    };
    return status ? (classes[status] ?? 'text-gray-900') : 'text-gray-900';
  }

  getScopeTypeLabel(scopeType: string | undefined): string {
    const labels: Record<string, string> = {
      INTERNAL: 'Вътрешен',
      EXTERNAL: 'Международен',
      NATIONAL: 'Национален',
    };
    return scopeType ? (labels[scopeType] ?? scopeType) : '-';
  }
}
