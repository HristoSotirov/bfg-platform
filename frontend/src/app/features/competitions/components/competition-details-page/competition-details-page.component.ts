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
import { Subject, takeUntil, catchError, of, forkJoin, Observable, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DateTimePickerComponent } from '../../../../shared/components/datetime-picker/datetime-picker.component';
import { DisciplineDetailsDialogComponent } from '../../../disciplines/components/discipline-details-dialog/discipline-details-dialog.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CompetitionsService,
  CompetitionDto,
  CompetitionUpdateRequest,
  CompetitionStatus,
  CompetitionType,
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
  QualificationEventType,
  CompetitionEventStatus,
  DisciplineDefinitionDto,
  CompetitionGroupDefinitionDto,
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
    DatePickerComponent,
    DateTimePickerComponent,
    DisciplineDetailsDialogComponent,
    CompetitionGroupDetailsDialogComponent,
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
  editData: Partial<CompetitionUpdateRequest> = {};

  // Scoring scheme data
  scoringScheme: ScoringSchemeDto | null = null;
  scoringRules: ScoringRuleDto[] = [];
  loadingScoring = false;

  // Qualification scheme data
  qualificationScheme: QualificationSchemeDto | null = null;
  qualificationTiers: QualificationTierDto[] = [];
  loadingQualification = false;

  // Disciplines (derived from timetable — no separate CRUD)
  get timetableDisciplines(): { disciplineId: string; label: string }[] {
    const seen = new Set<string>();
    return this.timetableEvents
      .filter((e) => e.disciplineId && !seen.has(e.disciplineId!) && seen.add(e.disciplineId!))
      .map((e) => ({
        disciplineId: e.disciplineId!,
        label: e.discipline?.shortName || e.discipline?.name || e.disciplineId!,
      }));
  }

  // Groups + disciplines for the disciplines tab, derived from expanded timetable data
  get disciplinesByGroup(): { groupId: string; groupName: string; group: CompetitionGroupDefinitionDto | null; disciplines: { disciplineId: string; label: string; fullName: string; dto: DisciplineDefinitionDto | null }[] }[] {
    const groupMap = new Map<string, { groupId: string; groupName: string; group: CompetitionGroupDefinitionDto | null; disciplines: { disciplineId: string; label: string; fullName: string; dto: DisciplineDefinitionDto | null }[] }>();
    const seenDisciplines = new Set<string>();

    for (const e of this.timetableEvents) {
      if (!e.disciplineId || seenDisciplines.has(e.disciplineId)) continue;
      seenDisciplines.add(e.disciplineId);

      const disc = e.discipline;
      const groupId = disc?.competitionGroupId || 'unknown';
      const groupName = disc?.competitionGroup?.shortName || disc?.competitionGroup?.name || 'Без група';

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { groupId, groupName, group: disc?.competitionGroup ?? null, disciplines: [] });
      }
      groupMap.get(groupId)!.disciplines.push({
        disciplineId: e.disciplineId,
        label: disc?.shortName || disc?.name || e.disciplineId,
        fullName: disc?.name || disc?.shortName || e.disciplineId,
        dto: disc ?? null,
      });
    }

    return Array.from(groupMap.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }

  // Discipline / group detail dialogs
  selectedDiscipline: DisciplineDefinitionDto | null = null;
  selectedGroup: CompetitionGroupDefinitionDto | null = null;
  disciplinePermalinkRoute: string[] | null = null;
  groupPermalinkRoute: string[] | null = null;

  get groupMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const e of this.timetableEvents) {
      const disc = e.discipline;
      if (disc?.competitionGroupId && disc.competitionGroup) {
        map[disc.competitionGroupId] = disc.competitionGroup.shortName || disc.competitionGroup.name || disc.competitionGroupId;
      }
    }
    return map;
  }

  openDisciplineDetails(dto: DisciplineDefinitionDto | null): void {
    if (!dto) return;
    this.selectedDiscipline = dto;
    this.disciplinePermalinkRoute = dto.uuid ? ['/regulations/disciplines', dto.uuid] : null;
    this.cdr.markForCheck();
  }

  openGroupDetails(group: CompetitionGroupDefinitionDto | null): void {
    if (!group) return;
    this.selectedGroup = group;
    this.groupPermalinkRoute = group.uuid ? ['/regulations/groups', group.uuid] : null;
    this.cdr.markForCheck();
  }

  closeDisciplineDetails(): void {
    this.selectedDiscipline = null;
    this.disciplinePermalinkRoute = null;
    this.cdr.markForCheck();
  }

  closeGroupDetails(): void {
    this.selectedGroup = null;
    this.groupPermalinkRoute = null;
    this.cdr.markForCheck();
  }

  // Timetable
  timetableEvents: CompetitionTimetableEventDto[] = [];
  loadingTimetable = false;

  // Add timetable event
  showAddTimetableEvent = false;
  savingTimetable = false;
  newEventScheduledAt = '';
  timetableError: string | null = null;
  newEvent: Partial<CompetitionTimetableEventRequest> = {};
  showDeleteTimetableConfirm = false;
  timetableEventToDelete: CompetitionTimetableEventDto | null = null;

  // Edit timetable event
  editingTimetableUuid: string | null = null;
  editTimetableData: Partial<CompetitionTimetableEventRequest> = {};
  editTimetableScheduledAt = '';
  editTimetableError: string | null = null;

  // Edit warning
  showEditingWarningDialog = false;

  get hasUnsavedEdits(): boolean {
    return !!this.editingTimetableUuid || this.showAddTimetableEvent;
  }

  readonly eventStatusOptions: SearchableSelectOption[] = [
    { value: CompetitionEventStatus.Scheduled, label: 'Насрочено' },
    { value: CompetitionEventStatus.InProgress, label: 'В ход' },
    { value: CompetitionEventStatus.Finished, label: 'Приключило' },
    { value: CompetitionEventStatus.Cancelled, label: 'Отменено' },
    { value: CompetitionEventStatus.Postponed, label: 'Отложено' },
  ];

  get eventTypeOptions(): SearchableSelectOption[] {
    const type = this.competition?.competitionType as string | undefined;
    if (type === 'ERG' || type === 'NATIONAL_TEAM_TEST') {
      return [{ value: QualificationEventType.H, label: 'Серия' }];
    }
    return [
      { value: QualificationEventType.H, label: 'Серия' },
      { value: QualificationEventType.Sf, label: 'Полуфинал' },
      { value: QualificationEventType.Fb, label: 'Финал Б' },
      { value: QualificationEventType.Fa, label: 'Финал А' },
    ];
  }

  // Option lists for editing — static search (load all on open, filter in-memory)
  scoringSchemeSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.scoringSchemesService.getAllScoringSchemes(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((items: any[]) => items.map((s: any) => ({
      value: s.uuid || '',
      label: s.name || '',
      disabled: !s.isActive,
    }))));

  qualificationSchemeSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.qualificationSchemesService.getAllQualificationSchemes(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((items: any[]) => items.map((s: any) => ({
      value: s.uuid || '',
      label: s.name || '',
      disabled: !s.isActive,
    }))));

  userRole: SystemRole | null = null;

  readonly statusOptions: SearchableSelectOption[] = [
    { value: CompetitionStatus.Planned, label: 'Планирано' },
    { value: CompetitionStatus.RegistrationOpen, label: 'Регистрация' },
    { value: CompetitionStatus.RegistrationClosed, label: 'Затворена регистрация' },
    { value: CompetitionStatus.InProgress, label: 'В ход' },
    { value: CompetitionStatus.Completed, label: 'Приключило' },
    { value: CompetitionStatus.Cancelled, label: 'Отменено' },
  ];

  readonly competitionTypeOptions: SearchableSelectOption[] = [
    { value: 'STANDARD', label: 'Стандартно (вода)' },
    { value: 'ERG', label: 'Ергометър' },
    { value: 'NATIONAL_TEAM_TEST', label: 'Тест национален отбор' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private competitionsService: CompetitionsService,
    private timetableEventsService: CompetitionTimetableEventsService,
    private scoringSchemesService: ScoringSchemesService,
    private scoringRulesService: ScoringRulesService,
    private qualificationSchemesService: QualificationSchemesService,
    private qualificationTiersService: QualificationTiersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const uuid = params.get('uuid');
      const tab = params.get('tab') as Tab | null;
      if (tab && this.isValidTab(tab)) {
        this.activeTab = tab;
      } else if (!tab && uuid) {
        this.router.navigate(['/competitions', uuid, 'details'], { replaceUrl: true });
        return;
      }
      if (uuid && uuid !== this.competition?.uuid) {
        this.loadCompetition(uuid);
      } else {
        // Competition already loaded — trigger lazy tab loads if needed
        this.triggerTabLoad(this.activeTab);
      }
    });
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
    if (tab === this.activeTab) return;
    if (this.hasUnsavedEdits) {
      this.showEditingWarningDialog = true;
      this.cdr.markForCheck();
      return;
    }
    this.activeTab = tab;
    const uuid = this.competition?.uuid ?? this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(['/competitions', uuid, tab], { replaceUrl: true });
    this.triggerTabLoad(tab);
    this.cdr.markForCheck();
  }

  private triggerTabLoad(tab: Tab): void {
    if ((tab === 'timetable' || tab === 'disciplines') && this.timetableEvents.length === 0 && !this.loadingTimetable) {
      this.loadTimetable();
    }
  }

  private isValidTab(tab: string): tab is Tab {
    return ['details', 'disciplines', 'timetable', 'entries', 'progression', 'results'].includes(tab);
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
          this.triggerTabLoad(this.activeTab);
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
      rules: fetchAllPages((skip, top) =>
        this.scoringRulesService.getAllScoringRules(
          `scoringSchemeId eq '${schemeId}'`,
          ['placement_asc'] as any,
          top,
          skip,
        ) as any
      ),
    })
      .pipe(
        catchError(() => of({ scheme: null, rules: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((result: any) => {
        this.scoringScheme = result.scheme;
        this.scoringRules = result.rules || [];
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
      tiers: fetchAllPages((skip, top) =>
        this.qualificationTiersService.getAllQualificationTiers(
          `qualificationSchemeId eq '${schemeId}'`,
          ['boatCountMin_asc'] as any,
          top,
          skip,
        ) as any
      ),
    })
      .pipe(
        catchError(() => of({ scheme: null, tiers: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((result: any) => {
        this.qualificationScheme = result.scheme;
        this.qualificationTiers = result.tiers || [];
        this.loadingQualification = false;
        this.cdr.markForCheck();
      });
  }

  loadTimetable(): void {
    if (!this.competition?.uuid) return;
    this.loadingTimetable = true;
    this.cdr.markForCheck();

    fetchAllPages((skip, top) =>
      this.timetableEventsService.getAllCompetitionTimetableEvents(
        `competitionId eq '${this.competition!.uuid}'`,
        ['scheduledAt_asc'] as any,
        top,
        skip,
        ['discipline', 'discipline.competitionGroup'] as any,
      ) as any
    )
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe((events: any[]) => {
        this.timetableEvents = events;
        this.loadingTimetable = false;
        this.cdr.markForCheck();
      });
  }

  // ===== EDIT COMPETITION =====

  startEditing(): void {
    if (!this.competition) return;
    this.editData = {
      shortName: this.competition.shortName,
      name: this.competition.name,
      location: this.competition.location,
      startDate: this.competition.startDate,
      endDate: this.competition.endDate,
      entrySubmissionsOpenAt: this.competition.entrySubmissionsOpenAt as any,
      entrySubmissionsClosedAt: this.competition.entrySubmissionsClosedAt as any,
      lastChangesBeforeTmAt: this.competition.lastChangesBeforeTmAt as any,
      technicalMeetingAt: this.competition.technicalMeetingAt as any,
      status: this.competition.status as CompetitionStatus,
      scoringSchemeId: this.competition.scoringSchemeId,
      qualificationSchemeId: this.competition.qualificationSchemeId,
      competitionType: this.competition.competitionType as CompetitionType,
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

  private appendZ(val: any): any {
    if (!val) return val;
    const s = String(val);
    return s.endsWith('Z') || s.includes('+') ? s : s + 'Z';
  }

  saveEditing(): void {
    if (!this.competition?.uuid) return;
    this.saving = true;
    this.editError = null;
    this.cdr.markForCheck();

    const request: CompetitionUpdateRequest = {
      ...(this.editData as CompetitionUpdateRequest),
      entrySubmissionsOpenAt: this.editData.entrySubmissionsOpenAt
        ? this.appendZ(this.editData.entrySubmissionsOpenAt) as any
        : undefined,
      entrySubmissionsClosedAt: this.editData.entrySubmissionsClosedAt
        ? this.appendZ(this.editData.entrySubmissionsClosedAt) as any
        : undefined,
      lastChangesBeforeTmAt: this.editData.lastChangesBeforeTmAt
        ? this.appendZ(this.editData.lastChangesBeforeTmAt) as any
        : undefined,
      technicalMeetingAt: this.editData.technicalMeetingAt
        ? this.appendZ(this.editData.technicalMeetingAt) as any
        : undefined,
    };

    this.competitionsService
      .updateCompetitionByUuid(this.competition.uuid, request)
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

  // ===== TIMETABLE TAB =====

  get disciplineOptionsForTimetable(): SearchableSelectOption[] {
    return this.timetableDisciplines.map((d) => ({
      value: d.disciplineId,
      label: d.label,
    }));
  }

  openAddTimetableEvent(): void {
    const defaultDate = this.competition?.startDate ?? '';
    this.newEventScheduledAt = defaultDate ? defaultDate + 'T09:00:00Z' : '';
    this.newEvent = {
      competitionId: this.competition?.uuid,
      qualificationEventType: QualificationEventType.H,
    };
    this.showAddTimetableEvent = true;
    this.timetableError = null;
    this.cdr.markForCheck();
  }

  cancelAddTimetableEvent(): void {
    this.showAddTimetableEvent = false;
    this.newEvent = {};
    this.newEventScheduledAt = '';
    this.timetableError = null;
    this.cdr.markForCheck();
  }

  saveAddTimetableEvent(): void {
    if (!this.competition?.uuid || !this.newEvent.disciplineId || !this.newEvent.qualificationEventType) return;
    this.savingTimetable = true;
    this.timetableError = null;
    this.cdr.markForCheck();

    const request: CompetitionTimetableEventRequest = {
      ...(this.newEvent as CompetitionTimetableEventRequest),
      eventStatus: CompetitionEventStatus.Scheduled,
      scheduledAt: this.newEventScheduledAt || undefined as any,
    };

    this.timetableEventsService
      .createCompetitionTimetableEvent(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showAddTimetableEvent = false;
          this.newEvent = {};
          this.newEventScheduledAt = '';
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

  startEditTimetableEvent(event: CompetitionTimetableEventDto): void {
    this.editingTimetableUuid = event.uuid!;
    this.editTimetableError = null;
    const isoStr = event.scheduledAt as unknown as string;
    this.editTimetableScheduledAt = isoStr || '';
    this.editTimetableData = {
      competitionId: event.competitionId!,
      disciplineId: event.disciplineId!,
      qualificationEventType: event.qualificationEventType! as any,
      eventStatus: event.eventStatus! as any,
    };
    this.cdr.markForCheck();
  }

  cancelEditTimetableEvent(): void {
    this.editingTimetableUuid = null;
    this.editTimetableData = {};
    this.editTimetableScheduledAt = '';
    this.editTimetableError = null;
    this.cdr.markForCheck();
  }

  saveEditTimetableEvent(): void {
    if (!this.editingTimetableUuid) return;
    this.savingTimetable = true;
    this.editTimetableError = null;
    this.cdr.markForCheck();

    const request: CompetitionTimetableEventRequest = {
      ...(this.editTimetableData as CompetitionTimetableEventRequest),
      scheduledAt: this.editTimetableScheduledAt || undefined as any,
    };

    this.timetableEventsService
      .updateCompetitionTimetableEventByUuid(this.editingTimetableUuid, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.editingTimetableUuid = null;
          this.editTimetableData = {};
          this.editTimetableScheduledAt = '';
          this.savingTimetable = false;
          this.loadTimetable();
        },
        error: (err) => {
          this.editTimetableError = err?.error?.message || 'Грешка при запис';
          this.savingTimetable = false;
          this.cdr.markForCheck();
        },
      });
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

  getDisciplineNameById(disciplineId: string | undefined): string {
    if (!disciplineId) return '-';
    const d = this.timetableDisciplines.find((d) => d.disciplineId === disciplineId);
    return d ? d.label : disciplineId;
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
      return new Date(dateStr).toLocaleString('bg-BG', { timeZone: 'Europe/Sofia' });
    } catch {
      return dateStr;
    }
  }

  formatDateOnly(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia' });
    } catch {
      return dateStr;
    }
  }

  formatTimeOnly(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' });
    } catch {
      return dateStr;
    }
  }

  getCompetitionTypeLabel(type: string | undefined): string {
    const labels: Record<string, string> = {
      STANDARD: 'Стандартно (вода)',
      ERG: 'Ергометър',
      NATIONAL_TEAM_TEST: 'Тест национален отбор',
    };
    return type ? (labels[type] ?? type) : '-';
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
}
