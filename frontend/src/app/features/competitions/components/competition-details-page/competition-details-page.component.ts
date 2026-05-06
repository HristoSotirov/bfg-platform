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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
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
import { ScoringDetailsDialogComponent } from '../../../scoring/components/scoring-details-dialog/scoring-details-dialog.component';
import { QualificationDetailsDialogComponent } from '../../../qualification/components/qualification-details-dialog/qualification-details-dialog.component';
import { SubmitEntriesDialogComponent } from '../submit-entries-dialog/submit-entries-dialog.component';
import {
  RaceChronometerComponent,
  ChronoState,
  ChronoResult,
} from '../race-chronometer/race-chronometer.component';
import { DeleteConfirmDialogComponent } from '../../../../shared/components/delete-confirm-dialog/delete-confirm-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CompetitionsService,
  CompetitionDto,
  CompetitionUpdateRequest,
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
  DisciplineDefinitionsService,
  CompetitionGroupDefinitionDto,
  EntriesService,
  EntryDto,
  ClubsService,
  ClubCoachesService,
  ScopeType,
  DisciplineGender,
  AccreditationStatus,
  SeatPosition,
  Gender,
  ProgressionService,
  CompetitionParticipationDto,
  DisciplineProgressionResult,
  ProgressionGenerationStatus,
  ParticipationStatus,
  SetLanesRequest,
  LaneAssignment,
  AthletePhotosService,
  WeightMeasurementsService,
  AthleteWeightMeasurementDto,
  RecordWeightRequest,
  WeightMeasurementRole,
  FinalStandingsService,
  CompetitionFinalStandingDto,
  FinalStandingsDto,
  ClubRankingsService,
  ClubRankingDto,
  DisciplineStandingResult,
  ComputeStandingsResponse,
} from '../../../../core/services/api';
import { SystemRole } from '../../../../core/models/navigation.model';
import { computeCompetitionStatus, STATUS_LABELS, STATUS_CLASSES, ComputedCompetitionStatus } from '../../utils/competition-status.util';
import { generateStartListPdf, StartListPdfEvent, generateResultsPdf, ResultsPdfDiscipline, generateWeighInPdf, WeighInPdfEvent } from '../../utils/start-list-pdf.util';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, Plugin } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

type Tab = 'details' | 'disciplines' | 'timetable' | 'entries' | 'progression' | 'results' | 'weigh-in' | 'complex-standings';

interface EntryAthleteRow {
  accreditationId: string;
  accreditationNumber: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  disciplineCount: number;
  coxCount: number;
  isTransfer: boolean;
  medicalExamDue: string | null;
  medicalValid: boolean;
  insuranceFrom: string | null;
  insuranceTo: string | null;
  insuranceValid: boolean;
  accreditationStatus: string;
}

interface CrewMemberView {
  seat: string;
  cardNumber: string;
  name: string;
  genderSuffix: string | null;
  isTransfer: boolean;
  isCox: boolean;
}

interface DisciplineDetailView {
  label: string;
  teams: { teamNumber: number; crew: CrewMemberView[] }[];
}

interface GenderTeamView {
  genderLabel: string;
  athletes: EntryAthleteRow[];
  totalAthletes: number;
}

interface EntryGroupView {
  groupId: string;
  groupLabel: string;
  transferRatio: number | null;
  maleTeam: GenderTeamView | null;
  femaleTeam: GenderTeamView | null;
  maleDisciplines: DisciplineDetailView[];
  femaleDisciplines: DisciplineDetailView[];
  mixedDisciplines: DisciplineDetailView[];
}

interface StartListEventView {
  eventUuid: string;
  disciplineId: string;
  qualificationEventType: string;
  disciplineLabel: string;
  eventTypeLabel: string;
  eventNumber: number;
  showNumber: boolean;
  scheduledAt: string | undefined;
  dayKey: string;
  eventStatus: string;
  eventStatusLabel: string;
  hasResults: boolean;
  participations: {
    participationUuid: string;
    entryId: string;
    lane: number;
    clubName: string;
    teamNumber: number;
    place: number | null;
    finishTimeMs: number | null;
    participationStatus: string | null;
    modifiedAt: string | null;
    crew: { seat: string; seatPosition: string; cardNumber: string; name: string; athleteId: string; accreditationYear: number | null; accreditationStatus: string; accreditationStatusRaw: string; }[];
  }[];
}

interface ProgressionDisciplineView {
  disciplineId: string;
  label: string;
  entryCount: number;
  currentStage: string;
  status: 'not_started' | 'in_progress' | 'finished';
  statusLabel: string;
}

interface ProgressionEventView {
  eventUuid: string;
  eventType: string;
  eventTypeLabel: string;
  eventStatus: string;
  eventStatusLabel: string;
  scheduledAt: string | undefined;
  participations: (CompetitionParticipationDto & {
    clubName: string;
    teamNumber: number;
    entryLabel: string;
  })[];
}

interface ResultEditRow {
  participationId: string;
  entryLabel: string;
  clubName: string;
  lane: number;
  finishStatus: string;
  timeInput: string;
}

@Component({
  selector: 'app-competition-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    NgChartsModule,
    TranslateModule,
    HeaderComponent,
    ButtonComponent,
    DialogComponent,
    SearchableSelectDropdownComponent,
    DatePickerComponent,
    DateTimePickerComponent,
    DisciplineDetailsDialogComponent,
    CompetitionGroupDetailsDialogComponent,
    ScoringDetailsDialogComponent,
    QualificationDetailsDialogComponent,
    SubmitEntriesDialogComponent,
    RaceChronometerComponent,
    DeleteConfirmDialogComponent,
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
  touched: Record<string, boolean> = {};
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
      const groupName = disc?.competitionGroup?.shortName || disc?.competitionGroup?.name || this.translate.instant('competitions.detailsPage.disciplines.noGroup');

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

  // Scoring / qualification scheme dialogs
  showScoringDialog = false;
  showQualificationDialog = false;

  openScoringDialog(): void {
    if (!this.scoringScheme) return;
    this.showScoringDialog = true;
    this.cdr.markForCheck();
  }

  openQualificationDialog(): void {
    if (!this.qualificationScheme) return;
    this.showQualificationDialog = true;
    this.cdr.markForCheck();
  }

  // Timetable
  timetableEvents: CompetitionTimetableEventDto[] = [];
  loadingTimetable = false;

  // Entries
  clubEntries: EntryDto[] = [];
  loadingEntries = false;
  showSubmitEntriesDialog = false;
  userClubId: string | null = null;
  selectedClubId: string | null = null;
  selectedClubDetailEntries: EntryDto[] = [];
  loadingClubDetail = false;

  // Club selection pre-dialog for admins
  showClubSelectDialog = false;
  clubOptions: { value: string; label: string }[] = [];
  selectedClubForEntries: string | null = null;
  entriesForSelectedClub: EntryDto[] = [];

  // Discipline entry detail dialog
  selectedDisciplineEntryId: string | null = null;
  selectedDisciplineEntryLabel = '';
  disciplineEntryRows: { entryId: string; clubName: string; teamNumber: number; crew: { seat: string; cardNumber: string; name: string; isTransfer: boolean; isCox: boolean }[] }[] = [];

  // Add timetable event
  showAddTimetableEvent = false;
  savingTimetable = false;
  newEventScheduledAt = '';
  timetableError: string | null = null;
  newEvent: Partial<CompetitionTimetableEventRequest> = {};
  showDeleteTimetableConfirm = false;
  timetableEventToDelete: CompetitionTimetableEventDto | null = null;
  deleteTimetableError: string | null = null;

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

  readonly eventStatusOptions: SearchableSelectOption[] = [];

  get eventTypeOptions(): SearchableSelectOption[] {
    const type = this.competition?.competitionType as string | undefined;
    if (type === CompetitionType.NationalErgo) {
      return [{ value: QualificationEventType.H, label: this.translate.instant('competitions.eventType.heat') }];
    }
    return [
      { value: QualificationEventType.H, label: this.translate.instant('competitions.eventType.heat') },
      { value: QualificationEventType.Sf, label: this.translate.instant('competitions.eventType.semifinal') },
      { value: QualificationEventType.Fb, label: this.translate.instant('competitions.eventType.finalB') },
      { value: QualificationEventType.Fa, label: this.translate.instant('competitions.eventType.finalA') },
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

  readonly competitionTypeOptions: SearchableSelectOption[] = [];

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
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private entriesService: EntriesService,
    private clubsService: ClubsService,
    private clubCoachesService: ClubCoachesService,
    private progressionService: ProgressionService,
    private athletePhotosService: AthletePhotosService,
    private weightMeasurementsService: WeightMeasurementsService,
    private finalStandingsService: FinalStandingsService,
    private clubRankingsService: ClubRankingsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initTranslatableOptions();
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.initTranslatableOptions();
      this.cdr.markForCheck();
    });

    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    // Resolve club ID for club roles
    if (user && this.userRole === SystemRole.ClubAdmin) {
      this.clubsService.getClubByAdminId(user.uuid)
        .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
        .subscribe((club) => {
          if (club?.uuid) {
            this.userClubId = club.uuid;
            this.cdr.markForCheck();
          }
        });
    } else if (user && this.userRole === SystemRole.Coach) {
      this.clubCoachesService.getClubByCoachId(user.uuid)
        .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
        .subscribe((club) => {
          if (club?.uuid) {
            this.userClubId = club.uuid;
            this.cdr.markForCheck();
          }
        });
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

  private initTranslatableOptions(): void {
    const t = (key: string) => this.translate.instant(key);
    (this as any).eventStatusOptions = [
      { value: CompetitionEventStatus.Scheduled, label: t('competitions.eventStatus.planiranoFull') },
      { value: CompetitionEventStatus.InProgress, label: t('competitions.eventStatus.inProgressFull') },
      { value: CompetitionEventStatus.UnofficialResults, label: t('competitions.eventStatus.unofficialResultsFull') },
      { value: CompetitionEventStatus.OfficialResults, label: t('competitions.eventStatus.officialResultsFull') },
      { value: CompetitionEventStatus.Cancelled, label: t('competitions.eventStatus.cancelledFull') },
    ];
    (this as any).competitionTypeOptions = [
      { value: CompetitionType.NationalErgo, label: t('competitions.competitionType.nationalErgo') },
      { value: CompetitionType.NationalWater, label: t('competitions.competitionType.nationalWater') },
      { value: CompetitionType.Balkan, label: t('competitions.competitionType.balkan') },
    ];
  }

  get canEdit(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  get tabs(): { id: Tab; label: string; available: boolean }[] {
    const isReal = !this.competition?.isTemplate;
    return [
      { id: 'details', label: this.translate.instant('competitions.detailsPage.tabs.details'), available: true },
      { id: 'disciplines', label: this.translate.instant('competitions.detailsPage.tabs.disciplines'), available: true },
      { id: 'timetable', label: this.translate.instant('competitions.detailsPage.tabs.timetable'), available: true },
      { id: 'entries', label: this.translate.instant('competitions.detailsPage.tabs.entries'), available: isReal },
      { id: 'progression', label: this.translate.instant('competitions.detailsPage.tabs.progression'), available: isReal },
      { id: 'weigh-in', label: this.translate.instant('competitions.detailsPage.tabs.weighIn'), available: isReal },
      { id: 'results', label: this.translate.instant('competitions.detailsPage.tabs.results'), available: isReal },
      { id: 'complex-standings', label: this.translate.instant('competitions.detailsPage.tabs.complexStandings'), available: isReal },
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
    if (tab === 'entries' && !this.loadingEntries) {
      // Always reload timetable first so discipline info is available
      if (this.timetableEvents.length === 0 && !this.loadingTimetable) {
        this.loadTimetable();
      }
      this.loadEntries();
    }
    if ((tab === 'progression' || tab === 'results') && !this.loadingProgression) {
      if (this.timetableEvents.length === 0 && !this.loadingTimetable) {
        this.loadTimetable();
      }
      if (this.clubEntries.length === 0 && !this.loadingEntries) {
        this.loadEntries();
      }
      this.loadProgression();
      if (tab === 'results') {
        this.loadFinalStandings();
      }
    }
    if (tab === 'weigh-in') {
      if (this.timetableEvents.length === 0 && !this.loadingTimetable) {
        this.loadTimetable();
      }
      if (this.clubEntries.length === 0 && !this.loadingEntries) {
        this.loadEntries();
      }
      if (!this.loadingProgression) {
        this.loadProgression();
      }
      this.loadWeightMeasurements();
    }
    if (tab === 'complex-standings') {
      this.loadClubRankings();
    }
  }

  private isValidTab(tab: string): tab is Tab {
    return ['details', 'disciplines', 'timetable', 'entries', 'progression', 'results', 'weigh-in', 'complex-standings'].includes(tab);
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
          this.error = err?.error?.message || this.translate.instant('competitions.detailsPage.errors.loadFailed');
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

  loadEntries(): void {
    if (!this.competition?.uuid) return;
    this.loadingEntries = true;
    this.cdr.markForCheck();

    this.entriesService
      .getCompetitionEntries(this.competition.uuid, undefined, ['club'])
      .pipe(
        catchError(() => of({ entries: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.clubEntries = result.entries ?? [];
        this.loadingEntries = false;
        this.cdr.markForCheck();
      });
  }

  private getClubName(entry: EntryDto): string {
    return entry.club?.shortName || entry.club?.name || entry.clubId || '-';
  }

  /** Overview: group → discipline → row per club/team */
  get entriesByGroupDiscipline(): {
    groupId: string; groupName: string;
    disciplines: {
      disciplineId: string; label: string;
      rows: { clubId: string; clubName: string; teamNumber: number; entry: EntryDto }[];
    }[];
  }[] {
    if (this.clubEntries.length === 0 || this.timetableEvents.length === 0) return [];

    const discInfo = new Map<string, { groupId: string; groupName: string; label: string }>();
    const seenDisc = new Set<string>();
    for (const e of this.timetableEvents) {
      if (!e.disciplineId || seenDisc.has(e.disciplineId)) continue;
      seenDisc.add(e.disciplineId);
      const d = e.discipline;
      discInfo.set(e.disciplineId, {
        groupId: d?.competitionGroupId || 'unknown',
        groupName: d?.competitionGroup?.shortName || d?.competitionGroup?.name || this.translate.instant('competitions.detailsPage.disciplines.noGroup'),
        label: d?.shortName || d?.name || e.disciplineId,
      });
    }

    const groupMap = new Map<string, Map<string, EntryDto[]>>();
    for (const entry of this.clubEntries) {
      const dId = entry.disciplineId || 'unknown';
      const info = discInfo.get(dId);
      const gId = info?.groupId || 'unknown';
      if (!groupMap.has(gId)) groupMap.set(gId, new Map());
      const dm = groupMap.get(gId)!;
      if (!dm.has(dId)) dm.set(dId, []);
      dm.get(dId)!.push(entry);
    }

    return Array.from(groupMap.entries()).map(([groupId, dm]) => ({
      groupId,
      groupName: discInfo.get(Array.from(dm.keys())[0])?.groupName || groupId,
      disciplines: Array.from(dm.entries()).map(([disciplineId, entries]) => ({
        disciplineId,
        label: discInfo.get(disciplineId)?.label || disciplineId,
        rows: entries
          .sort((a, b) => {
            const cA = this.getClubName(a);
            const cB = this.getClubName(b);
            if (cA !== cB) return cA.localeCompare(cB);
            return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
          })
          .map(e => ({
            clubId: e.clubId || '', clubName: this.getClubName(e),
            teamNumber: e.teamNumber ?? 1, entry: e,
          })),
      })).sort((a, b) => a.label.localeCompare(b.label)),
    })).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }

  /** Clubs that have submitted entries */
  get submittedClubs(): { clubId: string; clubName: string; entryCount: number }[] {
    const map = new Map<string, { name: string; count: number }>();
    for (const e of this.clubEntries) {
      const cid = e.clubId || 'unknown';
      if (!map.has(cid)) map.set(cid, { name: this.getClubName(e), count: 0 });
      map.get(cid)!.count++;
    }
    return Array.from(map.entries())
      .map(([clubId, v]) => ({ clubId, clubName: v.name, entryCount: v.count }))
      .sort((a, b) => a.clubName.localeCompare(b.clubName));
  }

  /** Entries for the selected club detail dialog, grouped by discipline */
  get selectedClubEntries(): { disciplineId: string; label: string; teams: { teamNumber: number; entry: EntryDto }[] }[] {
    if (!this.selectedClubId || this.selectedClubDetailEntries.length === 0) return [];
    const byDisc = new Map<string, EntryDto[]>();
    for (const e of this.selectedClubDetailEntries) {
      const dId = e.disciplineId || 'unknown';
      if (!byDisc.has(dId)) byDisc.set(dId, []);
      byDisc.get(dId)!.push(e);
    }
    return Array.from(byDisc.entries()).map(([disciplineId, discEntries]) => ({
      disciplineId,
      label: this.getDisciplineNameById(disciplineId),
      teams: discEntries
        .sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
        .map(e => ({ teamNumber: e.teamNumber ?? 1, entry: e })),
    })).sort((a, b) => a.label.localeCompare(b.label));
  }

  openClubDetail(clubId: string): void {
    this.selectedClubId = clubId;
    this.selectedClubDetailEntries = [];
    this.loadingClubDetail = true;
    this.cdr.markForCheck();

    // Admins pass clubId to filter; club roles omit it (backend resolves their club)
    const filterClubId = this.canEdit ? clubId : undefined;

    this.entriesService
      .getCompetitionEntries(this.competition!.uuid!, filterClubId, ['crewMembers', 'crewMembers.accreditation', 'crewMembers.accreditation.athlete'])
      .pipe(
        catchError(() => of({ entries: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.selectedClubDetailEntries = (result.entries ?? []).filter(e => e.clubId === clubId);
        this.loadingClubDetail = false;
        this.cdr.markForCheck();
      });
  }

  closeClubDetail(): void {
    this.selectedClubId = null;
    this.selectedClubDetailEntries = [];
    this.loadingClubDetail = false;
    this.transferSchemaDialog = null;
    this.cdr.markForCheck();
  }

  transferSchemaDialog: { groupLabel: string; teamSize: number; transferRatio: number; transferCount: number; maxAllowed: number; isOver: boolean } | null = null;

  openTransferSchemaDialog(athletes: EntryAthleteRow[], transferRatio: number, groupLabel: string): void {
    const coxOnly = athletes.filter(a => a.coxCount > 0 && a.disciplineCount === 0).length;
    const teamSize = athletes.length - coxOnly;
    const transferCount = athletes.filter(a => a.isTransfer && !(a.coxCount > 0 && a.disciplineCount === 0)).length;
    const maxAllowed = Math.floor(teamSize * transferRatio / 100);
    const isOver = transferCount > maxAllowed;
    this.transferSchemaDialog = { groupLabel, teamSize, transferRatio, transferCount, maxAllowed, isOver };
    this.cdr.markForCheck();
  }

  closeTransferSchemaDialog(): void {
    this.transferSchemaDialog = null;
    this.cdr.markForCheck();
  }

  getTransferSchema(teamSize: number, transferRatio: number): { total: number; maxTransfer: number }[] {
    const max = Math.max(12, teamSize + 2);
    const table: { total: number; maxTransfer: number }[] = [];
    for (let total = 2; total <= max; total++) {
      table.push({ total, maxTransfer: Math.floor(total * transferRatio / 100) });
    }
    return table;
  }

  getTeamBreakdown(athletes: EntryAthleteRow[]): { own: number; transfer: number; coxOnly: number } {
    const coxOnly = athletes.filter(a => a.coxCount > 0 && a.disciplineCount === 0).length;
    const transfer = athletes.filter(a => a.isTransfer && !(a.coxCount > 0 && a.disciplineCount === 0)).length;
    const own = athletes.length - transfer - coxOnly;
    return { own, transfer, coxOnly };
  }

  openDisciplineEntryDetail(disciplineId: string, label: string): void {
    this.selectedDisciplineEntryLabel = label;
    this.selectedDisciplineEntryId = disciplineId;
    this.disciplineEntryRows = [];
    this.cdr.markForCheck();

    this.entriesService
      .getCompetitionEntries(
        this.competition!.uuid!, undefined,
        ['crewMembers', 'crewMembers.accreditation', 'crewMembers.accreditation.athlete', 'club']
      )
      .pipe(
        catchError(() => of({ entries: [] as EntryDto[] })),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        const entries = (result.entries ?? []).filter(e => e.disciplineId === disciplineId);
        this.disciplineEntryRows = entries
          .sort((a, b) => {
            const clubCmp = (a.club?.shortName || a.club?.name || '').localeCompare(b.club?.shortName || b.club?.name || '');
            if (clubCmp !== 0) return clubCmp;
            return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
          })
          .map(entry => ({
            entryId: entry.uuid || '',
            clubName: entry.club?.shortName || entry.club?.name || entry.clubId || '-',
            teamNumber: entry.teamNumber ?? 1,
            crew: this.sortCrewMembers(entry.crewMembers || []).map(cm => {
              const isCoxSeat = cm.seatPosition === 'COX';
              return {
                seat: this.SEAT_LABELS[cm.seatPosition || ''] || cm.seatPosition || '?',
                cardNumber: cm.accreditation?.accreditationNumber || '',
                name: cm.accreditation?.athlete
                  ? `${cm.accreditation.athlete.firstName || ''} ${cm.accreditation.athlete.lastName || ''}`.trim()
                  : (cm.accreditationId || '?'),
                isTransfer: !isCoxSeat && !!(cm.accreditation?.clubId && entry.clubId && cm.accreditation.clubId !== entry.clubId),
                isCox: false,
              };
            }),
          }));
        this.cdr.markForCheck();
      });
  }

  closeDisciplineEntryDetail(): void {
    this.selectedDisciplineEntryId = null;
    this.disciplineEntryRows = [];
    this.cdr.markForCheck();
  }

  getSelectedClubName(): string {
    if (!this.selectedClubId) return '';
    const entry = this.clubEntries.find(e => e.clubId === this.selectedClubId);
    return entry ? this.getClubName(entry) : this.selectedClubId;
  }

  // ===== CLUB DETAIL — GROUPED VIEW =====

  private get SEAT_LABELS(): Record<string, string> {
    return {
      BOW: this.translate.instant('competitions.seatLabels.BOW'),
      TWO: this.translate.instant('competitions.seatLabels.TWO'),
      THREE: this.translate.instant('competitions.seatLabels.THREE'),
      FOUR: this.translate.instant('competitions.seatLabels.FOUR'),
      FIVE: this.translate.instant('competitions.seatLabels.FIVE'),
      SIX: this.translate.instant('competitions.seatLabels.SIX'),
      SEVEN: this.translate.instant('competitions.seatLabels.SEVEN'),
      STROKE: this.translate.instant('competitions.seatLabels.STROKE'),
      COX: this.translate.instant('competitions.seatLabels.COX'),
    };
  }

  private buildDisciplineMeta(): Map<string, { gender: string; groupId: string; groupName: string; discLabel: string; transferRatio: number | null }> {
    const meta = new Map<string, { gender: string; groupId: string; groupName: string; discLabel: string; transferRatio: number | null }>();
    for (const e of this.timetableEvents) {
      if (!e.disciplineId || !e.discipline) continue;
      const disc = e.discipline;
      meta.set(e.disciplineId, {
        gender: disc.gender || 'MALE',
        groupId: disc.competitionGroupId || 'unknown',
        groupName: disc.competitionGroup?.shortName || disc.competitionGroup?.name || this.translate.instant('competitions.detailsPage.disciplines.noGroup'),
        discLabel: disc.shortName || disc.name || e.disciplineId,
        transferRatio: disc.competitionGroup?.transferRatio ?? null,
      });
    }
    return meta;
  }

  isDateValid(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
  }

  isInsuranceCurrentlyValid(from: string | null | undefined, to: string | null | undefined): boolean {
    if (!from || !to) return false;
    const now = new Date();
    return new Date(from) <= now && now <= new Date(to);
  }

  formatDateShort(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  }

  get entryGroupViews(): EntryGroupView[] {
    if (!this.selectedClubId || this.selectedClubDetailEntries.length === 0 || this.timetableEvents.length === 0) return [];

    const discMeta = this.buildDisciplineMeta();

    // Group entries by competitionGroupId
    const groupEntriesMap = new Map<string, { groupName: string; entries: EntryDto[] }>();
    for (const entry of this.selectedClubDetailEntries) {
      const dId = entry.disciplineId || 'unknown';
      const meta = discMeta.get(dId);
      const gId = meta?.groupId || 'unknown';
      const gName = meta?.groupName || this.translate.instant('competitions.detailsPage.disciplines.noGroup');
      if (!groupEntriesMap.has(gId)) groupEntriesMap.set(gId, { groupName: gName, entries: [] });
      groupEntriesMap.get(gId)!.entries.push(entry);
    }

    const result: EntryGroupView[] = [];

    for (const [groupId, groupData] of groupEntriesMap.entries()) {
      // Partition entries by discipline gender
      const maleEntries: EntryDto[] = [];
      const femaleEntries: EntryDto[] = [];
      const mixedEntries: EntryDto[] = [];

      for (const entry of groupData.entries) {
        const meta = discMeta.get(entry.disciplineId || '');
        const gender = meta?.gender || 'MALE';
        if (gender === DisciplineGender.Male) maleEntries.push(entry);
        else if (gender === DisciplineGender.Female) femaleEntries.push(entry);
        else mixedEntries.push(entry);
      }

      // Collect unique athletes for MALE team: from MALE disciplines + male athletes from MIXED
      const maleAthleteMap = new Map<string, { row: EntryAthleteRow }>();
      this.collectAthletesFromEntries(maleEntries, null, maleAthleteMap);
      this.collectAthletesFromEntries(mixedEntries, Gender.MALE, maleAthleteMap);

      // Collect unique athletes for FEMALE team: from FEMALE disciplines + female athletes from MIXED
      const femaleAthleteMap = new Map<string, { row: EntryAthleteRow }>();
      this.collectAthletesFromEntries(femaleEntries, null, femaleAthleteMap);
      this.collectAthletesFromEntries(mixedEntries, Gender.FEMALE, femaleAthleteMap);

      const maleAthletes = Array.from(maleAthleteMap.values())
        .map(v => v.row)
        .sort((a, b) => (a.accreditationNumber || '').localeCompare(b.accreditationNumber || ''));

      const femaleAthletes = Array.from(femaleAthleteMap.values())
        .map(v => v.row)
        .sort((a, b) => (a.accreditationNumber || '').localeCompare(b.accreditationNumber || ''));

      // Build discipline detail views
      const maleDisciplines = this.buildDisciplineDetails(maleEntries, discMeta, null);
      const femaleDisciplines = this.buildDisciplineDetails(femaleEntries, discMeta, null);
      const mixedDisciplines = this.buildDisciplineDetails(mixedEntries, discMeta, 'mixed');

      const firstMeta = [...groupData.entries].map(e => discMeta.get(e.disciplineId || '')).find(m => m);
      const transferRatio = firstMeta?.transferRatio ?? null;

      result.push({
        groupId,
        groupLabel: groupData.groupName,
        transferRatio,
        maleTeam: maleAthletes.length > 0 ? { genderLabel: this.translate.instant('competitions.detailsPage.clubDetail.maleTeam'), athletes: maleAthletes, totalAthletes: maleAthletes.length } : null,
        femaleTeam: femaleAthletes.length > 0 ? { genderLabel: this.translate.instant('competitions.detailsPage.clubDetail.femaleTeam'), athletes: femaleAthletes, totalAthletes: femaleAthletes.length } : null,
        maleDisciplines,
        femaleDisciplines,
        mixedDisciplines,
      });
    }

    return result.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }

  private collectAthletesFromEntries(
    entries: EntryDto[],
    filterGender: string | null,
    athleteMap: Map<string, { row: EntryAthleteRow }>,
  ): void {
    for (const entry of entries) {
      if (!entry.crewMembers) continue;
      for (const cm of entry.crewMembers) {
        const accr = cm.accreditation;
        const athlete = accr?.athlete;
        if (!accr?.uuid) continue;

        // Filter by gender if specified (for MIXED disciplines)
        if (filterGender && athlete?.gender !== filterGender) continue;

        const isCox = cm.seatPosition === SeatPosition.Cox;
        const isTransfer = !!(accr.clubId && entry.clubId && accr.clubId !== entry.clubId);

        if (!athleteMap.has(accr.uuid)) {
          athleteMap.set(accr.uuid, {
            row: {
              accreditationId: accr.uuid,
              accreditationNumber: accr.accreditationNumber || '',
              name: [athlete?.firstName, athlete?.middleName, athlete?.lastName].filter(Boolean).join(' ') || accr.uuid,
              gender: athlete?.gender || '',
              dateOfBirth: athlete?.dateOfBirth || null,
              disciplineCount: isCox ? 0 : 1,
              coxCount: isCox ? 1 : 0,
              isTransfer,
              medicalExamDue: athlete?.medicalExaminationDue || null,
              medicalValid: this.isDateValid(athlete?.medicalExaminationDue),
              insuranceFrom: athlete?.insuranceFrom || null,
              insuranceTo: athlete?.insuranceTo || null,
              insuranceValid: this.isInsuranceCurrentlyValid(athlete?.insuranceFrom, athlete?.insuranceTo),
              accreditationStatus: accr.status || '',
            },
          });
        } else {
          const existing = athleteMap.get(accr.uuid)!.row;
          if (isCox) {
            existing.coxCount++;
          } else {
            existing.disciplineCount++;
          }
        }
      }
    }
  }

  private buildDisciplineDetails(
    entries: EntryDto[],
    discMeta: Map<string, { gender: string; groupId: string; groupName: string; discLabel: string; transferRatio: number | null }>,
    mode: 'mixed' | null,
  ): DisciplineDetailView[] {
    const byDisc = new Map<string, EntryDto[]>();
    for (const entry of entries) {
      const dId = entry.disciplineId || 'unknown';
      if (!byDisc.has(dId)) byDisc.set(dId, []);
      byDisc.get(dId)!.push(entry);
    }

    const result: DisciplineDetailView[] = [];
    for (const [discId, discEntries] of byDisc.entries()) {
      const meta = discMeta.get(discId);
      const label = meta?.discLabel || discId;

      const teams = discEntries
        .sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
        .map(entry => {
          const crew: CrewMemberView[] = this.sortCrewMembers(entry.crewMembers || []).map(cm => {
            const seat = this.SEAT_LABELS[cm.seatPosition || ''] || cm.seatPosition || '?';
            const athlete = cm.accreditation?.athlete;
            const name = athlete ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() : (cm.accreditationId || '?');
            const cardNumber = cm.accreditation?.accreditationNumber || '';
            const isCox = cm.seatPosition === SeatPosition.Cox;
            const genderSuffix = (!isCox && mode === 'mixed' && athlete?.gender)
              ? (athlete.gender === Gender.MALE ? this.translate.instant('competitions.genderAbbrev.male') : this.translate.instant('competitions.genderAbbrev.female'))
              : null;
            const isTransfer = !isCox && !!(cm.accreditation?.clubId && entry.clubId && cm.accreditation.clubId !== entry.clubId);
            return { seat, cardNumber, name, genderSuffix, isTransfer, isCox: false };
          });
          return { teamNumber: entry.teamNumber ?? 1, crew };
        });

      result.push({ label, teams });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }

  /** Whether the submission period is still open */
  get isSubmissionOpen(): boolean {
    if (!this.competition) return false;
    const now = new Date();
    const openAt = this.competition.entrySubmissionsOpenAt ? new Date(this.competition.entrySubmissionsOpenAt) : null;
    const closedAt = this.competition.entrySubmissionsClosedAt ? new Date(this.competition.entrySubmissionsClosedAt) : null;
    if (openAt && now < openAt) return false;
    if (closedAt && now > closedAt) return false;
    return true;
  }

  /** Whether current user can submit entries (club roles during open period, or admins anytime) */
  get canSubmitEntries(): boolean {
    if (this.canEdit) return true; // admins can always submit
    return this.isSubmissionOpen;
  }

  onSubmitEntriesClick(): void {
    if (this.canEdit) {
      const compType = this.competition?.competitionType as string | undefined;
      let filter: string | undefined;
      if (compType === CompetitionType.NationalErgo || compType === CompetitionType.NationalWater) {
        filter = `scopeType eq '${ScopeType.Internal}'`;
      } else if (compType === CompetitionType.Balkan) {
        filter = `scopeType eq '${ScopeType.National}'`;
      }
      this.clubsService.getAllClubs(filter, undefined, undefined, 1000, 0)
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          this.clubOptions = (response.content || [])
            .map(c => ({ value: c.uuid!, label: c.name || c.uuid! }));
          this.showClubSelectDialog = true;
          this.cdr.markForCheck();
        });
    } else {
      this.loadEntriesForDialogAndOpen(this.userClubId!);
    }
  }

  onClubSelectedForEntries(clubId: string | null): void {
    if (!clubId || !this.competition) return;
    this.selectedClubForEntries = clubId;
    this.showClubSelectDialog = false;
    this.cdr.markForCheck();
    this.loadEntriesForDialogAndOpen(clubId);
  }

  private loadEntriesForDialogAndOpen(clubId: string): void {
    if (!this.competition?.uuid) return;
    this.entriesService.getCompetitionEntries(
      this.competition.uuid, clubId,
      ['crewMembers', 'crewMembers.accreditation', 'crewMembers.accreditation.athlete']
    ).pipe(
      catchError(() => of({ entries: [] as EntryDto[] })),
      takeUntil(this.destroy$),
    ).subscribe(result => {
      this.entriesForSelectedClub = result.entries ?? [];
      this.showSubmitEntriesDialog = true;
      this.cdr.markForCheck();
    });
  }

  get competitionYear(): number {
    if (!this.competition?.startDate) return new Date().getFullYear();
    return new Date(this.competition.startDate).getFullYear();
  }

  // ===== PROGRESSION TAB =====

  progressionParticipations: CompetitionParticipationDto[] = [];
  progressionEntries: EntryDto[] = [];
  loadingProgression = false;
  progressionError: string | null = null;
  generatingProgression = false;
  generateResults: DisciplineProgressionResult[] = [];
  showGenerateResultsDialog = false;
  showDisciplineSelectDialog = false;
  disciplineSelectionMap: Record<string, boolean> = {};
  allDisciplinesSelected = true;
  selectedStartListDay: string | null = null;
  laneRearrangeOpen = false;
  laneRearrangeTitle = '';
  laneRearrangeDisciplineId = '';
  laneRearrangeEventType = '';
  laneRearrangeEvents: { eventUuid: string; eventIndex: number; label: string; entries: { entryId: string; clubName: string; teamNumber: number; crew: { seat: string; name: string; }[]; }[]; }[] = [];
  laneRearrangeSaving = false;
  laneRearrangeError: string | null = null;
  crewVerifyParticipation: StartListEventView['participations'][0] | null = null;
  crewVerifyEvent: StartListEventView | null = null;
  crewVerifyIndex = 0;
  crewVerifyPhotoUrl: string | null = null;
  crewVerifyPhotoLoading = false;
  selectedProgressionDisciplineId: string | null = null;
  selectedProgressionEventId: string | null = null;
  eventParticipations: CompetitionParticipationDto[] = [];
  loadingEventParticipations = false;
  resultEdits: ResultEditRow[] = [];
  savingResults = false;
  resultsError: string | null = null;
  saveResultsStatus: CompetitionEventStatus = CompetitionEventStatus.UnofficialResults;

  // Final standings
  finalStandings: CompetitionFinalStandingDto[] = [];
  loadingStandings = false;
  computingStandings = false;
  standingsError: string | null = null;
  showStandingsSelectDialog = false;
  showStandingsResultsDialog = false;
  standingsSelectionMap: Record<string, boolean> = {};
  allStandingsSelected = true;
  standingsGenerateResults: DisciplineStandingResult[] = [];
  standingsDisciplineErrors: Record<string, string> = {};

  // Club rankings (complex standings)
  clubRankings: ClubRankingDto[] = [];
  loadingClubRankings = false;
  clubRankingsError: string | null = null;
  expandedClubs = new Set<string>();
  private _chartView: 'total' | 'stacked' | 'medals' = 'total';
  private _chartGender: 'MALE' | 'FEMALE' | 'ALL' = 'ALL';
  private _chartGroup: string = 'ALL';
  cachedChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  cachedChartOptions: ChartOptions<'bar'> = {};

  get chartView() { return this._chartView; }
  set chartView(v: 'total' | 'stacked' | 'medals') { this._chartView = v; this.rebuildChart(); }
  get chartGender() { return this._chartGender; }
  set chartGender(v: 'MALE' | 'FEMALE' | 'ALL') { this._chartGender = v; this.rebuildChart(); }
  get chartGroup() { return this._chartGroup; }
  set chartGroup(v: string) { this._chartGroup = v; this.rebuildChart(); }

  readonly CompetitionEventStatus = CompetitionEventStatus;
  readonly saveResultsStatusOptions: SearchableSelectOption[] = [
    { value: CompetitionEventStatus.UnofficialResults, label: this.translate.instant('competitions.resultsEntry.statusOptions.unofficialResults') },
    { value: CompetitionEventStatus.OfficialResults, label: this.translate.instant('competitions.resultsEntry.statusOptions.officialResults') },
  ];

  // Chronometer
  chronoStates = new Map<string, ChronoState>();
  chronoDialogOpen = false;
  chronoDialogMode: 'start' | 'finish' = 'start';
  showChronoStopConfirm = false;

  // Lane editing
  editingLanes = false;
  laneEdits: { entryId: string; entryLabel: string; eventIndex: number; lane: number }[] = [];
  savingLanes = false;
  lanesError: string | null = null;

  readonly finishStatusOptions: SearchableSelectOption[] = [
    { value: ParticipationStatus.Finished, label: 'FINISHED' },
    { value: ParticipationStatus.Dns, label: 'DNS' },
    { value: ParticipationStatus.Dnf, label: 'DNF' },
    { value: ParticipationStatus.Dsq, label: 'DSQ' },
  ];

  readonly ProgressionGenerationStatus = ProgressionGenerationStatus;

  loadProgression(silent = false): void {
    if (!this.competition?.uuid) return;
    if (!silent) {
      this.loadingProgression = true;
    }
    this.progressionError = null;
    this.cdr.markForCheck();

    if (this.timetableEvents.length === 0 && !this.loadingTimetable) {
      this.loadTimetable();
    }

    forkJoin({
      progression: this.progressionService.getProgressionData(this.competition.uuid).pipe(
        catchError(() => of({ participations: [] as CompetitionParticipationDto[] })),
      ),
      entries: this.entriesService.getCompetitionEntries(
        this.competition.uuid, undefined,
        ['club', 'crewMembers', 'crewMembers.accreditation', 'crewMembers.accreditation.athlete'] as any,
      ).pipe(
        catchError(() => of({ entries: [] as EntryDto[] })),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ progression, entries }) => {
          this.progressionParticipations = progression.participations ?? [];
          this.progressionEntries = entries.entries ?? [];
          this.clubEntries = this.progressionEntries;
          this.loadingProgression = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.progressionError = err?.error?.message || this.translate.instant('competitions.detailsPage.progression.errors.loadFailed');
          this.loadingProgression = false;
          this.cdr.markForCheck();
        },
      });
  }

  get progressionDisciplines(): ProgressionDisciplineView[] {
    const discMap = new Map<string, { label: string; events: CompetitionTimetableEventDto[] }>();

    for (const ev of this.timetableEvents) {
      if (!ev.disciplineId) continue;
      if (!discMap.has(ev.disciplineId)) {
        discMap.set(ev.disciplineId, {
          label: ev.discipline?.shortName || ev.discipline?.name || ev.disciplineId,
          events: [],
        });
      }
      discMap.get(ev.disciplineId)!.events.push(ev);
    }

    const result: ProgressionDisciplineView[] = [];

    for (const [disciplineId, data] of discMap.entries()) {
      // Count entries for this discipline
      const entryCount = this.clubEntries.filter(e => e.disciplineId === disciplineId).length;

      // Find participations for this discipline's events
      const eventUuids = new Set(data.events.map(e => e.uuid).filter(Boolean));
      const discParticipations = this.progressionParticipations.filter(p => eventUuids.has(p.competitionEventId));

      // Determine current stage
      let currentStage = '-';
      if (discParticipations.length > 0) {
        // Find the latest event type that has participations
        const stageOrder = ['FA', 'FB', 'SF', 'H'];
        for (const stage of stageOrder) {
          const stageEvents = data.events.filter(e => e.qualificationEventType === stage);
          const stageEventIds = new Set(stageEvents.map(e => e.uuid));
          if (discParticipations.some(p => stageEventIds.has(p.competitionEventId))) {
            currentStage = this.getEventTypLabel(stage);
            break;
          }
        }
      }

      // Determine status
      let status: 'not_started' | 'in_progress' | 'finished' = 'not_started';
      let statusLabel = this.translate.instant('competitions.detailsPage.progression.statusLabels.notStarted');
      if (discParticipations.length > 0) {
        const allFinished = data.events
          .filter(e => {
            const eid = e.uuid;
            return discParticipations.some(p => p.competitionEventId === eid);
          })
          .every(e => e.eventStatus === CompetitionEventStatus.OfficialResults);

        if (allFinished) {
          status = 'finished';
          statusLabel = this.translate.instant('competitions.detailsPage.progression.statusLabels.finished');
        } else {
          status = 'in_progress';
          statusLabel = this.translate.instant('competitions.detailsPage.progression.statusLabels.inProgress');
        }
      }

      result.push({ disciplineId, label: data.label, entryCount, currentStage, status, statusLabel });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }

  get resultsDisciplines(): ProgressionDisciplineView[] {
    const discs = this.progressionDisciplines;
    const faTimeMap = new Map<string, string>();
    for (const ev of this.timetableEvents) {
      if (ev.qualificationEventType === 'FA' && ev.disciplineId && ev.scheduledAt) {
        const existing = faTimeMap.get(ev.disciplineId);
        if (!existing || ev.scheduledAt < existing) {
          faTimeMap.set(ev.disciplineId, ev.scheduledAt);
        }
      }
    }
    return [...discs].sort((a, b) => {
      const tA = faTimeMap.get(a.disciplineId) ?? 'zzzz';
      const tB = faTimeMap.get(b.disciplineId) ?? 'zzzz';
      return tA.localeCompare(tB);
    });
  }

  private sortResultsByFaTime<T extends { disciplineId?: string }>(results: T[]): T[] {
    const order = new Map(this.resultsDisciplines.map((d, i) => [d.disciplineId, i]));
    return [...results].sort((a, b) => {
      const iA = order.get(a.disciplineId ?? '') ?? 9999;
      const iB = order.get(b.disciplineId ?? '') ?? 9999;
      return iA - iB;
    });
  }

  get startListEvents(): StartListEventView[] {
    if (this.progressionParticipations.length === 0) return [];

    const entryMap = new Map<string, EntryDto>();
    for (const entry of this.progressionEntries.length > 0 ? this.progressionEntries : this.clubEntries) {
      if (entry.uuid) entryMap.set(entry.uuid, entry);
    }

    const participationsByEvent = new Map<string, CompetitionParticipationDto[]>();
    for (const p of this.progressionParticipations) {
      if (!p.competitionEventId) continue;
      const list = participationsByEvent.get(p.competitionEventId) ?? [];
      list.push(p);
      participationsByEvent.set(p.competitionEventId, list);
    }

    const eventTypeCounters = new Map<string, number>();

    const stageOrder: Record<string, number> = { H: 0, SF: 1, FB: 2, FA: 3 };

    const eventsWithParticipations = this.timetableEvents
      .filter(ev => ev.uuid && participationsByEvent.has(ev.uuid))
      .sort((a, b) => {
        return (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '');
      });

    const result: StartListEventView[] = [];

    for (const ev of eventsWithParticipations) {
      const key = `${ev.disciplineId}:${ev.qualificationEventType}`;
      const count = (eventTypeCounters.get(key) ?? 0) + 1;
      eventTypeCounters.set(key, count);

      const participations = (participationsByEvent.get(ev.uuid!) ?? [])
        .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0))
        .map(p => {
          const entry = p.entryId ? entryMap.get(p.entryId) : null;
          const crew = entry?.crewMembers
            ? this.sortCrewMembers(entry.crewMembers).map(cm => ({
                seat: this.SEAT_LABELS[cm.seatPosition || ''] || cm.seatPosition || '?',
                seatPosition: cm.seatPosition || '',
                cardNumber: cm.accreditation?.accreditationNumber || '',
                name: cm.accreditation?.athlete
                  ? `${cm.accreditation.athlete.firstName || ''} ${cm.accreditation.athlete.lastName || ''}`.trim()
                  : '',
                athleteId: cm.accreditation?.athleteId || '',
                accreditationYear: cm.accreditation?.year ?? null,
                accreditationStatus: this.getAccreditationStatusLabel(cm.accreditation?.status),
                accreditationStatusRaw: cm.accreditation?.status || '',
              }))
            : [];
          return {
            participationUuid: p.uuid ?? '',
            entryId: p.entryId ?? '',
            lane: p.lane ?? 0,
            clubName: entry?.club?.shortName || entry?.club?.name || '-',
            teamNumber: entry?.teamNumber ?? 1,
            place: p.place ?? null,
            finishTimeMs: p.finishTimeMs ?? null,
            participationStatus: p.participationStatus ?? null,
            modifiedAt: p.modifiedAt ?? null,
            crew,
          };
        });

      const hasResults = participations.some(p => p.place != null || p.finishTimeMs != null);
      if (hasResults) {
        participations.sort((a, b) => {
          if (a.place != null && b.place != null) return a.place - b.place;
          if (a.place != null) return -1;
          if (b.place != null) return 1;
          return (a.lane ?? 0) - (b.lane ?? 0);
        });
      }

      const showNumber = ev.qualificationEventType === 'H' || ev.qualificationEventType === 'SF';

      let dayKey = '';
      if (ev.scheduledAt) {
        try { dayKey = new Date(ev.scheduledAt).toISOString().slice(0, 10); } catch { /* */ }
      }

      result.push({
        eventUuid: ev.uuid!,
        disciplineId: ev.disciplineId || '',
        qualificationEventType: ev.qualificationEventType || '',
        disciplineLabel: ev.discipline?.shortName || ev.discipline?.name || '-',
        eventTypeLabel: this.getEventTypLabel(ev.qualificationEventType),
        eventNumber: count,
        showNumber,
        scheduledAt: ev.scheduledAt,
        dayKey,
        eventStatus: ev.eventStatus ?? '',
        eventStatusLabel: this.getEventStatusLabel(ev.eventStatus),
        hasResults,
        participations,
      });
    }

    return result;
  }

  get startListDays(): { key: string; label: string }[] {
    const seen = new Set<string>();
    const days: { key: string; label: string }[] = [];
    for (const ev of this.startListEvents) {
      if (ev.dayKey && !seen.has(ev.dayKey)) {
        seen.add(ev.dayKey);
        try {
          const d = new Date(ev.dayKey + 'T00:00:00');
          days.push({ key: ev.dayKey, label: d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', weekday: 'short' }) });
        } catch {
          days.push({ key: ev.dayKey, label: ev.dayKey });
        }
      }
    }
    return days.sort((a, b) => a.key.localeCompare(b.key));
  }

  get activeStartListDay(): string {
    const days = this.startListDays;
    if (days.length === 0) return '';
    if (this.selectedStartListDay && days.some(d => d.key === this.selectedStartListDay)) {
      return this.selectedStartListDay;
    }
    return days[0].key;
  }

  get filteredStartListEvents(): StartListEventView[] {
    const day = this.activeStartListDay;
    if (!day) return this.startListEvents;
    return this.startListEvents.filter(ev => ev.dayKey === day);
  }

  selectStartListDay(key: string): void {
    this.selectedStartListDay = key;
    this.cdr.markForCheck();
  }

  onAdvanceClick(): void {
    this.disciplineSelectionMap = {};
    for (const disc of this.resultsDisciplines) {
      this.disciplineSelectionMap[disc.disciplineId] = true;
    }
    this.allDisciplinesSelected = true;
    this.showDisciplineSelectDialog = true;
    this.cdr.markForCheck();
  }

  toggleAllDisciplines(): void {
    this.allDisciplinesSelected = !this.allDisciplinesSelected;
    for (const disc of this.resultsDisciplines) {
      this.disciplineSelectionMap[disc.disciplineId] = this.allDisciplinesSelected;
    }
    this.cdr.markForCheck();
  }

  toggleDiscipline(disciplineId: string): void {
    this.disciplineSelectionMap[disciplineId] = !this.disciplineSelectionMap[disciplineId];
    this.allDisciplinesSelected = this.resultsDisciplines.every(
      d => this.disciplineSelectionMap[d.disciplineId]
    );
    this.cdr.markForCheck();
  }

  confirmAdvanceProgression(): void {
    if (!this.competition?.uuid) return;
    this.generatingProgression = true;
    this.progressionError = null;
    this.showDisciplineSelectDialog = false;
    this.cdr.markForCheck();

    const selectedIds = Object.entries(this.disciplineSelectionMap)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    const disciplineIds = this.allDisciplinesSelected ? [] : selectedIds;

    this.progressionService
      .advanceProgression(this.competition.uuid, { disciplineIds })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.generateResults = this.sortResultsByFaTime(response.results ?? []);
          this.generatingProgression = false;
          this.showGenerateResultsDialog = true;
          this.selectedStartListDay = null;
          this.loadProgression();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.progressionError = err?.error?.message || this.translate.instant('competitions.detailsPage.progression.errors.generateFailed');
          this.generatingProgression = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ===== START LIST EVENT DETAIL DIALOG =====

  // ===== LANE REARRANGE DIALOG =====

  openLaneRearrange(ev: StartListEventView): void {
    const allEvents = this.startListEvents
      .filter(e => e.disciplineId === ev.disciplineId && e.qualificationEventType === ev.qualificationEventType)
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));

    this.laneRearrangeDisciplineId = ev.disciplineId;
    this.laneRearrangeEventType = ev.qualificationEventType;
    this.laneRearrangeTitle = `${ev.disciplineLabel} — ${ev.eventTypeLabel} · ${this.translate.instant('competitions.laneRearrange.titleSuffix')}`;
    this.laneRearrangeEvents = allEvents.map((e, i) => ({
      eventUuid: e.eventUuid,
      eventIndex: i,
      label: e.showNumber ? `${e.eventTypeLabel} ${e.eventNumber}` : e.eventTypeLabel,
      entries: e.participations.map(p => ({
        entryId: p.entryId,
        clubName: p.clubName,
        teamNumber: p.teamNumber,
        crew: p.crew.map(c => ({ seat: c.seat, name: c.name })),
      })),
    }));
    this.laneRearrangeError = null;
    this.laneRearrangeSaving = false;
    this.laneRearrangeOpen = true;
    this.cdr.markForCheck();
  }

  closeLaneRearrange(): void {
    this.laneRearrangeOpen = false;
    this.laneRearrangeEvents = [];
    this.laneRearrangeError = null;
    this.cdr.markForCheck();
  }

  get laneDropListIds(): string[] {
    return this.laneRearrangeEvents.map(e => 'lane-list-' + e.eventIndex);
  }

  onLaneDrop(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.cdr.markForCheck();
  }

  saveLaneRearrange(): void {
    if (!this.competition?.uuid) return;
    this.laneRearrangeSaving = true;
    this.laneRearrangeError = null;
    this.cdr.markForCheck();

    const assignments: LaneAssignment[] = [];
    for (const ev of this.laneRearrangeEvents) {
      for (let i = 0; i < ev.entries.length; i++) {
        assignments.push({
          entryId: ev.entries[i].entryId,
          eventIndex: ev.eventIndex,
          lane: i + 1,
        });
      }
    }

    const request: SetLanesRequest = {
      disciplineId: this.laneRearrangeDisciplineId,
      qualificationEventType: this.laneRearrangeEventType as QualificationEventType,
      assignments,
    };

    this.progressionService.setLanes(this.competition.uuid, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.progressionParticipations = result.participations || [];
          this.laneRearrangeSaving = false;
          this.laneRearrangeOpen = false;
          this.laneRearrangeEvents = [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.laneRearrangeError = err?.error?.errors?.join(', ') || err?.error?.message || this.translate.instant('competitions.laneRearrangeErrors.saveFailed');
          this.laneRearrangeSaving = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ===== CREW VERIFICATION DIALOG =====

  openCrewVerify(ev: StartListEventView, entryId: string): void {
    const participation = ev.participations.find(p => p.entryId === entryId);
    if (!participation || participation.crew.length === 0) return;
    this.crewVerifyEvent = ev;
    this.crewVerifyParticipation = participation;
    this.crewVerifyIndex = 0;
    this.loadCrewPhoto(participation.crew[0].athleteId);
    if (this.weightMeasurements.length === 0 && !this.loadingWeights) {
      this.loadWeightMeasurements();
    }
    this.cdr.markForCheck();
  }

  closeCrewVerify(): void {
    this.crewVerifyParticipation = null;
    this.crewVerifyEvent = null;
    this.crewVerifyIndex = 0;
    this.crewVerifyPhotoUrl = null;
    this.crewVerifyPhotoLoading = false;
    this.crewVerifySaving = false;
    this.crewVerifyError = null;
    this.cdr.markForCheck();
  }

  crewVerifySaving = false;
  crewVerifyError: string | null = null;

  toggleCrewVerifyStatus(): void {
    if (!this.competition?.uuid || !this.crewVerifyParticipation) return;
    const p = this.crewVerifyParticipation;
    const newStatus = p.participationStatus === ParticipationStatus.CheckedIn
      ? ParticipationStatus.Registered
      : ParticipationStatus.CheckedIn;

    this.crewVerifySaving = true;
    this.crewVerifyError = null;
    this.cdr.markForCheck();

    this.progressionService
      .updateParticipationStatus(this.competition.uuid, p.participationUuid, { participationStatus: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          p.participationStatus = newStatus;
          p.modifiedAt = new Date().toISOString();
          this.crewVerifySaving = false;
          this.closeCrewVerify();
          this.loadProgression(true);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.crewVerifySaving = false;
          const errors = err?.error?.errors;
          this.crewVerifyError = Array.isArray(errors) ? errors.join(', ') : (err?.error?.message || this.translate.instant('competitions.crewVerifyErrors.statusFailed'));
          this.cdr.markForCheck();
        },
      });
  }

  // ===== WEIGHT MEASUREMENTS (Кантар) =====
  weightMeasurements: AthleteWeightMeasurementDto[] = [];
  loadingWeights = false;
  selectedWeighInDay: string | null = null;
  weighInRecording = false;
  weighInError: string | null = null;
  weighInEditAthleteId: string | null = null;
  weighInEditWeight = '';
  weighInEditRole: WeightMeasurementRole = WeightMeasurementRole.Rower;
  weighInEditName = '';
  weighInEditCardNumber = '';
  weighInEditPhotoUrl: string | null = null;
  weighInEditPhotoLoading = false;
  weighInEditScheduledAt: string | null = null;
  weighInEditDisciplineLabel = '';
  readonly WeightMeasurementRole = WeightMeasurementRole;

  loadWeightMeasurements(): void {
    if (!this.competition?.uuid) return;
    this.loadingWeights = true;
    this.cdr.markForCheck();

    const date = this.activeWeighInDay || undefined;
    this.weightMeasurementsService
      .getWeightMeasurements(this.competition.uuid, date)
      .pipe(
        catchError(() => of([] as AthleteWeightMeasurementDto[])),
        takeUntil(this.destroy$),
      )
      .subscribe((measurements) => {
        this.weightMeasurements = measurements;
        this.loadingWeights = false;
        this.cdr.markForCheck();
      });
  }

  get weighInDays(): { key: string; label: string }[] {
    return this.startListDays;
  }

  get activeWeighInDay(): string {
    const days = this.weighInDays;
    if (days.length === 0) return '';
    if (this.selectedWeighInDay && days.some(d => d.key === this.selectedWeighInDay)) {
      return this.selectedWeighInDay;
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayDay = days.find(d => d.key === today);
    if (todayDay) return todayDay.key;
    return days[0].key;
  }

  selectWeighInDay(key: string): void {
    this.selectedWeighInDay = key;
    this.loadWeightMeasurements();
    this.cdr.markForCheck();
  }

  get isWeighInToday(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.activeWeighInDay === today;
  }


  get weighInEventGroups(): { eventUuid: string; disciplineLabel: string; eventTypeLabel: string; eventNumber: number; showNumber: boolean; scheduledAt: string | undefined; crews: { clubName: string; teamNumber: number; athletes: { athleteId: string; seat: string; name: string; cardNumber: string; role: WeightMeasurementRole; roleLabel: string; weightKg: number | null; weightLimit: number | null; weightMin: number | null; isInvalid: boolean; needsCompensation: boolean; comment: string | null }[] }[] }[] {
    const day = this.activeWeighInDay;
    if (!day) return [];
    const eventsForDay = this.startListEvents.filter(ev => ev.dayKey === day);
    const measurementMap = new Map<string, AthleteWeightMeasurementDto>();
    for (const m of this.weightMeasurements) {
      if (m.athleteId) measurementMap.set(m.athleteId, m);
    }

    const result: { eventUuid: string; disciplineLabel: string; eventTypeLabel: string; eventNumber: number; showNumber: boolean; scheduledAt: string | undefined; crews: { clubName: string; teamNumber: number; athletes: { athleteId: string; seat: string; name: string; cardNumber: string; role: WeightMeasurementRole; roleLabel: string; weightKg: number | null; weightLimit: number | null; weightMin: number | null; isInvalid: boolean; needsCompensation: boolean; comment: string | null }[] }[] }[] = [];

    for (const ev of eventsForDay) {
      const disc = this.timetableEvents.find(t => t.disciplineId === ev.disciplineId)?.discipline;
      if (!disc) continue;
      const isLightweight = disc.isLightweight ?? false;
      const hasCox = disc.hasCoxswain ?? false;
      if (!isLightweight && !hasCox) continue;

      const group = disc.competitionGroup;
      const gender = disc.gender;
      const rowerLimit = isLightweight && group
        ? (gender === DisciplineGender.Female ? (group.femaleTeamLightMaxWeightKg ?? null) : (group.maleTeamLightMaxWeightKg ?? null))
        : null;
      const coxRequired = hasCox && group
        ? (gender === DisciplineGender.Female ? (group.femaleTeamCoxRequiredWeightKg ?? null) : (group.maleTeamCoxRequiredWeightKg ?? null))
        : null;
      const coxMin = hasCox && group
        ? (gender === DisciplineGender.Female ? (group.femaleTeamCoxMinWeightKg ?? null) : (group.maleTeamCoxMinWeightKg ?? null))
        : null;

      const crews: { clubName: string; teamNumber: number; athletes: { athleteId: string; seat: string; name: string; cardNumber: string; role: WeightMeasurementRole; roleLabel: string; weightKg: number | null; weightLimit: number | null; weightMin: number | null; isInvalid: boolean; needsCompensation: boolean; comment: string | null }[] }[] = [];

      for (const p of ev.participations) {
        const athletes: { athleteId: string; seat: string; name: string; cardNumber: string; role: WeightMeasurementRole; roleLabel: string; weightKg: number | null; weightLimit: number | null; weightMin: number | null; isInvalid: boolean; needsCompensation: boolean; comment: string | null }[] = [];

        for (const crew of p.crew) {
          if (!crew.athleteId) continue;
          const isCox = crew.seatPosition === SeatPosition.Cox;
          const m = measurementMap.get(crew.athleteId);
          const wKg = m?.weightKg ?? null;
          const seat = this.SEAT_LABELS[crew.seatPosition || ''] || crew.seatPosition || '?';

          if (isCox && hasCox) {
            const isInvalid = wKg != null && coxMin != null && wKg < coxMin;
            const needsCompensation = wKg != null && !isInvalid && coxRequired != null && wKg < coxRequired;
            let comment: string | null = null;
            if (isInvalid && coxMin != null) comment = this.translate.instant('competitions.weighInComments.belowMinimum', { min: coxMin });
            else if (needsCompensation && coxRequired != null) comment = this.translate.instant('competitions.weighInComments.compensation', { required: coxRequired });
            athletes.push({
              athleteId: crew.athleteId,
              seat,
              name: crew.name,
              cardNumber: crew.cardNumber,
              role: WeightMeasurementRole.Cox,
              roleLabel: this.translate.instant('competitions.roleLabels.cox'),
              weightKg: wKg,
              weightLimit: coxRequired,
              weightMin: coxMin,
              isInvalid,
              needsCompensation,
              comment,
            });
          } else if (!isCox && isLightweight) {
            const isInvalid = wKg != null && rowerLimit != null && wKg > rowerLimit;
            const comment = isInvalid && rowerLimit != null ? this.translate.instant('competitions.weighInComments.aboveLimit', { max: rowerLimit }) : null;
            athletes.push({
              athleteId: crew.athleteId,
              seat,
              name: crew.name,
              cardNumber: crew.cardNumber,
              role: WeightMeasurementRole.Rower,
              roleLabel: this.translate.instant('competitions.roleLabels.rower'),
              weightKg: wKg,
              weightLimit: rowerLimit,
              weightMin: null,
              isInvalid,
              needsCompensation: false,
              comment,
            });
          }
        }

        if (athletes.length > 0) {
          crews.push({ clubName: p.clubName, teamNumber: p.teamNumber, athletes });
        }
      }

      if (crews.length > 0) {
        result.push({
          eventUuid: ev.eventUuid,
          disciplineLabel: ev.disciplineLabel,
          eventTypeLabel: ev.eventTypeLabel,
          eventNumber: ev.eventNumber,
          showNumber: ev.showNumber,
          scheduledAt: ev.scheduledAt,
          crews,
        });
      }
    }
    return result;
  }



  openWeighInEdit(athleteId: string, role: WeightMeasurementRole, name: string, cardNumber: string, scheduledAt: string | undefined, disciplineLabel: string): void {
    if (!this.isWeighInToday) return;
    this.weighInEditAthleteId = athleteId;
    this.weighInEditRole = role;
    this.weighInEditName = name;
    this.weighInEditCardNumber = cardNumber;
    this.weighInEditScheduledAt = scheduledAt ?? null;
    this.weighInEditDisciplineLabel = disciplineLabel;
    this.weighInError = null;
    const existing = this.weightMeasurements.find(m => m.athleteId === athleteId);
    this.weighInEditWeight = existing?.weightKg != null ? String(existing.weightKg) : '';
    this.loadWeighInPhoto(athleteId);
    this.cdr.markForCheck();
  }

  closeWeighInEdit(): void {
    this.weighInEditAthleteId = null;
    this.weighInEditWeight = '';
    this.weighInEditPhotoUrl = null;
    this.weighInEditPhotoLoading = false;
    this.weighInEditScheduledAt = null;
    this.cdr.markForCheck();
  }

  private loadWeighInPhoto(athleteId: string): void {
    if (!athleteId) {
      this.weighInEditPhotoUrl = null;
      this.weighInEditPhotoLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.weighInEditPhotoLoading = true;
    this.weighInEditPhotoUrl = null;
    this.cdr.markForCheck();

    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], 1, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const photos = res.content ?? [];
          this.weighInEditPhotoUrl = photos.length > 0 ? (photos[0].photoUrl ?? null) : null;
          this.weighInEditPhotoLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.weighInEditPhotoUrl = null;
          this.weighInEditPhotoLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  get weighInTimeWarning(): string | null {
    if (!this.weighInEditScheduledAt) return null;
    const eventTime = new Date(this.weighInEditScheduledAt).getTime();
    const now = Date.now();
    const diffMs = eventTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return this.translate.instant('competitions.weighInWarnings.lessThanOneHour');
    }
    if (diffHours > 2) {
      return this.translate.instant('competitions.weighInWarnings.moreThanTwoHours');
    }
    return null;
  }

  saveWeighIn(): void {
    if (!this.competition?.uuid || !this.weighInEditAthleteId || !this.weighInEditWeight) return;
    const weight = parseFloat(this.weighInEditWeight);
    if (isNaN(weight) || weight <= 0) return;

    this.weighInRecording = true;
    this.weighInError = null;
    this.cdr.markForCheck();

    const request: RecordWeightRequest = {
      athleteId: this.weighInEditAthleteId,
      weightKg: weight,
      role: this.weighInEditRole,
    };

    this.weightMeasurementsService
      .recordWeight(this.competition.uuid, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const idx = this.weightMeasurements.findIndex(m => m.athleteId === result.athleteId);
          if (idx >= 0) {
            this.weightMeasurements[idx] = result;
          } else {
            this.weightMeasurements = [...this.weightMeasurements, result];
          }
          this.weighInRecording = false;
          this.weighInError = null;
          this.closeWeighInEdit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.weighInRecording = false;
          this.weighInError = err?.error?.message || this.translate.instant('competitions.weighInErrors.saveFailed');
          this.cdr.markForCheck();
        },
      });
  }

  getAthleteWeight(athleteId: string): AthleteWeightMeasurementDto | null {
    return this.weightMeasurements.find(m => m.athleteId === athleteId) ?? null;
  }

  private get ACCREDITATION_STATUS_LABELS(): Record<string, string> {
    return {
      [AccreditationStatus.Active]: this.translate.instant('competitions.accreditationStatusLabels.ACTIVE'),
      [AccreditationStatus.PendingValidation]: this.translate.instant('competitions.accreditationStatusLabels.PENDING_VALIDATION'),
      [AccreditationStatus.PendingPhotoValidation]: this.translate.instant('competitions.accreditationStatusLabels.PENDING_PHOTO_VALIDATION'),
      [AccreditationStatus.NewPhotoRequired]: this.translate.instant('competitions.accreditationStatusLabels.NEW_PHOTO_REQUIRED'),
      [AccreditationStatus.Expired]: this.translate.instant('competitions.accreditationStatusLabels.EXPIRED'),
      [AccreditationStatus.Suspended]: this.translate.instant('competitions.accreditationStatusLabels.SUSPENDED'),
    };
  }

  private getAccreditationStatusLabel(status: string | undefined): string {
    return status ? (this.ACCREDITATION_STATUS_LABELS[status] || status) : '';
  }

  getAccreditationStatusClass(status: string): string {
    switch (status) {
      case AccreditationStatus.Active: return 'text-green-600';
      case AccreditationStatus.Expired: return 'text-gray-500';
      case AccreditationStatus.PendingValidation:
      case AccreditationStatus.PendingPhotoValidation: return 'text-yellow-600';
      case AccreditationStatus.NewPhotoRequired: return 'text-orange-500';
      case AccreditationStatus.Suspended: return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  get crewVerifyTitle(): string {
    if (!this.crewVerifyEvent || !this.crewVerifyParticipation) return '';
    const ev = this.crewVerifyEvent;
    const p = this.crewVerifyParticipation;
    const time = ev.scheduledAt ? this.formatTimeOnly(ev.scheduledAt) : '';
    return `${ev.disciplineLabel} — ${p.clubName} (${p.teamNumber})${time ? ' · ' + time : ''}`;
  }

  get crewVerifyCurrentMember(): StartListEventView['participations'][0]['crew'][0] | null {
    if (!this.crewVerifyParticipation) return null;
    return this.crewVerifyParticipation.crew[this.crewVerifyIndex] ?? null;
  }

  crewVerifyNeedsWeight(member: StartListEventView['participations'][0]['crew'][0]): boolean {
    if (!this.crewVerifyEvent) return false;
    if (member.seatPosition === SeatPosition.Cox) return true;
    const disc = this.timetableEvents.find(t => t.disciplineId === this.crewVerifyEvent!.disciplineId)?.discipline;
    return disc?.isLightweight ?? false;
  }

  crewVerifyWeightClass(member: StartListEventView['participations'][0]['crew'][0]): string {
    if (!this.crewVerifyEvent) return 'text-gray-500 text-xs';
    const w = this.getAthleteWeight(member.athleteId);
    if (!w || w.weightKg == null) return 'text-gray-400 text-xs';

    const disc = this.timetableEvents.find(t => t.disciplineId === this.crewVerifyEvent!.disciplineId)?.discipline;
    const group = disc?.competitionGroup;
    if (!group) return 'text-green-600 text-xs font-medium';

    if (member.seatPosition === SeatPosition.Cox) {
      const minWeight = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamCoxMinWeightKg ?? null)
        : (group.maleTeamCoxMinWeightKg ?? null);
      const requiredWeight = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamCoxRequiredWeightKg ?? null)
        : (group.maleTeamCoxRequiredWeightKg ?? null);
      if (minWeight != null && w.weightKg < minWeight) return 'text-red-600 text-xs font-medium';
      if (requiredWeight != null && w.weightKg < requiredWeight) return 'text-orange-500 text-xs font-medium';
    } else if (disc?.isLightweight) {
      const limit = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamLightMaxWeightKg ?? null)
        : (group.maleTeamLightMaxWeightKg ?? null);
      if (limit != null && w.weightKg > limit) return 'text-red-600 text-xs font-medium';
    }

    return 'text-green-600 text-xs font-medium';
  }

  crewVerifyWeightComment(member: StartListEventView['participations'][0]['crew'][0]): string | null {
    if (!this.crewVerifyEvent) return null;
    const w = this.getAthleteWeight(member.athleteId);
    if (!w || w.weightKg == null) return null;

    const disc = this.timetableEvents.find(t => t.disciplineId === this.crewVerifyEvent!.disciplineId)?.discipline;
    const group = disc?.competitionGroup;
    if (!group) return null;

    if (member.seatPosition === SeatPosition.Cox) {
      const minWeight = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamCoxMinWeightKg ?? null)
        : (group.maleTeamCoxMinWeightKg ?? null);
      const requiredWeight = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamCoxRequiredWeightKg ?? null)
        : (group.maleTeamCoxRequiredWeightKg ?? null);
      if (minWeight != null && w.weightKg < minWeight) return this.translate.instant('competitions.weighInComments.belowMinimum', { min: minWeight });
      if (requiredWeight != null && w.weightKg < requiredWeight) return this.translate.instant('competitions.weighInComments.compensation', { required: requiredWeight });
    } else if (disc?.isLightweight) {
      const limit = disc?.gender === DisciplineGender.Female
        ? (group.femaleTeamLightMaxWeightKg ?? null)
        : (group.maleTeamLightMaxWeightKg ?? null);
      if (limit != null && w.weightKg > limit) return this.translate.instant('competitions.weighInComments.aboveLimit', { max: limit });
    }

    return null;
  }

  get crewVerifyCanPrev(): boolean {
    return this.crewVerifyIndex > 0;
  }

  get crewVerifyCanNext(): boolean {
    if (!this.crewVerifyParticipation) return false;
    return this.crewVerifyIndex < this.crewVerifyParticipation.crew.length - 1;
  }

  crewVerifyGoPrev(): void {
    if (!this.crewVerifyCanPrev || !this.crewVerifyParticipation) return;
    this.crewVerifyIndex--;
    this.loadCrewPhoto(this.crewVerifyParticipation.crew[this.crewVerifyIndex].athleteId);
    this.cdr.markForCheck();
  }

  crewVerifyGoNext(): void {
    if (!this.crewVerifyCanNext || !this.crewVerifyParticipation) return;
    this.crewVerifyIndex++;
    this.loadCrewPhoto(this.crewVerifyParticipation.crew[this.crewVerifyIndex].athleteId);
    this.cdr.markForCheck();
  }

  private loadCrewPhoto(athleteId: string): void {
    if (!athleteId) {
      this.crewVerifyPhotoUrl = null;
      this.crewVerifyPhotoLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.crewVerifyPhotoLoading = true;
    this.crewVerifyPhotoUrl = null;
    this.cdr.markForCheck();

    this.athletePhotosService
      .getAthletePhotos(athleteId, undefined, ['uploadedAt_desc'], 1, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const photos = res.content ?? [];
          this.crewVerifyPhotoUrl = photos.length > 0 ? (photos[0].photoUrl ?? null) : null;
          this.crewVerifyPhotoLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.crewVerifyPhotoUrl = null;
          this.crewVerifyPhotoLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  openProgressionDiscipline(disciplineId: string): void {
    this.selectedProgressionDisciplineId = disciplineId;
    this.cdr.markForCheck();
  }

  closeProgressionDiscipline(): void {
    this.selectedProgressionDisciplineId = null;
    this.editingLanes = false;
    this.laneEdits = [];
    this.lanesError = null;
    this.cdr.markForCheck();
  }

  startEditingLanes(): void {
    this.editingLanes = true;
    this.lanesError = null;
    this.laneEdits = [];
    for (let i = 0; i < this.disciplineEvents.length; i++) {
      const ev = this.disciplineEvents[i];
      for (const p of ev.participations) {
        this.laneEdits.push({
          entryId: p.entryId || '',
          entryLabel: p.clubName + ' #' + p.teamNumber,
          eventIndex: i,
          lane: p.lane || 0,
        });
      }
    }
    this.cdr.markForCheck();
  }

  cancelEditingLanes(): void {
    this.editingLanes = false;
    this.laneEdits = [];
    this.lanesError = null;
    this.cdr.markForCheck();
  }

  saveLanes(): void {
    if (!this.selectedProgressionDisciplineId || !this.competition?.uuid) return;
    const eventType = this.disciplineEvents[0]?.eventType;
    if (!eventType) return;

    this.savingLanes = true;
    this.lanesError = null;
    this.cdr.markForCheck();

    const assignments: LaneAssignment[] = this.laneEdits.map(e => ({
      entryId: e.entryId,
      eventIndex: e.eventIndex,
      lane: e.lane,
    }));

    const request: SetLanesRequest = {
      disciplineId: this.selectedProgressionDisciplineId,
      qualificationEventType: eventType as QualificationEventType,
      assignments,
    };

    this.progressionService.setLanes(this.competition.uuid, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.progressionParticipations = result.participations || [];
          this.editingLanes = false;
          this.laneEdits = [];
          this.savingLanes = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lanesError = err?.error?.errors?.join(', ') || err?.error?.message || this.translate.instant('competitions.resultsErrors.lanesSaveFailed');
          this.savingLanes = false;
          this.cdr.markForCheck();
        },
      });
  }

  get selectedProgressionDisciplineLabel(): string {
    if (!this.selectedProgressionDisciplineId) return '';
    return this.getDisciplineNameById(this.selectedProgressionDisciplineId);
  }

  get disciplineEvents(): ProgressionEventView[] {
    if (!this.selectedProgressionDisciplineId) return [];

    const events = this.timetableEvents.filter(
      e => e.disciplineId === this.selectedProgressionDisciplineId
    );

    // Build entry lookup
    const entryMap = new Map<string, EntryDto>();
    for (const entry of this.clubEntries) {
      if (entry.uuid) entryMap.set(entry.uuid, entry);
    }

    const stageOrder: Record<string, number> = { H: 0, SF: 1, FB: 2, FA: 3 };

    return events
      .sort((a, b) => {
        const sa = stageOrder[a.qualificationEventType ?? ''] ?? 99;
        const sb = stageOrder[b.qualificationEventType ?? ''] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '');
      })
      .map(ev => {
        const participations = this.progressionParticipations
          .filter(p => p.competitionEventId === ev.uuid)
          .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0))
          .map(p => {
            const entry = p.entryId ? entryMap.get(p.entryId) : null;
            const clubName = entry?.club?.shortName || entry?.club?.name || entry?.clubId || '-';
            const teamNumber = entry?.teamNumber ?? 1;
            const entryLabel = `${clubName} (${teamNumber})`;
            return { ...p, clubName, teamNumber, entryLabel };
          });

        return {
          eventUuid: ev.uuid ?? '',
          eventType: ev.qualificationEventType ?? '',
          eventTypeLabel: this.getEventTypLabel(ev.qualificationEventType),
          eventStatus: ev.eventStatus ?? '',
          eventStatusLabel: this.getEventStatusLabel(ev.eventStatus),
          scheduledAt: ev.scheduledAt,
          participations,
        };
      });
  }

  openResultsEntry(eventUuid: string): void {
    if (!this.competition?.uuid) return;
    this.selectedProgressionEventId = eventUuid;
    this.loadingEventParticipations = true;
    this.resultsError = null;

    const existingEvent = this.timetableEvents.find(e => e.uuid === eventUuid);
    this.saveResultsStatus = existingEvent?.eventStatus === CompetitionEventStatus.OfficialResults
      ? CompetitionEventStatus.OfficialResults
      : CompetitionEventStatus.UnofficialResults;

    this.cdr.markForCheck();

    this.progressionService
      .getEventParticipations(this.competition.uuid, eventUuid)
      .pipe(
        catchError(() => of({ participations: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((data) => {
        this.eventParticipations = data.participations ?? [];

        // Build entry lookup
        const entryMap = new Map<string, EntryDto>();
        for (const entry of this.clubEntries) {
          if (entry.uuid) entryMap.set(entry.uuid, entry);
        }

        this.resultEdits = this.eventParticipations
          .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0))
          .map(p => {
            const entry = p.entryId ? entryMap.get(p.entryId) : null;
            const clubName = entry?.club?.shortName || entry?.club?.name || entry?.clubId || '-';
            return {
              participationId: p.uuid ?? '',
              entryLabel: `${clubName} (${entry?.teamNumber ?? 1})`,
              clubName,
              lane: p.lane ?? 0,
              finishStatus: p.participationStatus ?? ParticipationStatus.Registered,
              timeInput: p.finishTimeMs ? this.formatTimeMs(p.finishTimeMs) : '',
            };
          });

        this.loadingEventParticipations = false;
        this.cdr.markForCheck();
      });
  }

  get selectedEventLabel(): string {
    if (!this.selectedProgressionEventId) return '';
    const ev = this.timetableEvents.find(e => e.uuid === this.selectedProgressionEventId);
    if (!ev) return '';
    const disc = this.getDisciplineNameById(ev.disciplineId);
    const type = this.getEventTypLabel(ev.qualificationEventType);
    return `${disc} - ${type}`;
  }

  get selectedEventHasResults(): boolean {
    if (!this.selectedProgressionEventId) return false;
    const ev = this.timetableEvents.find(e => e.uuid === this.selectedProgressionEventId);
    return ev?.eventStatus === CompetitionEventStatus.UnofficialResults
      || ev?.eventStatus === CompetitionEventStatus.OfficialResults;
  }

  saveResults(): void {
    if (!this.competition?.uuid || !this.selectedProgressionEventId) return;
    this.savingResults = true;
    this.resultsError = null;
    this.cdr.markForCheck();

    const results = this.resultEdits.map(r => ({
      participationId: r.participationId,
      finishStatus: r.finishStatus as ParticipationStatus,
      finishTimeMs: r.finishStatus === ParticipationStatus.Finished ? this.parseTimeInput(r.timeInput) : undefined,
    }));

    // Validate that FINISHED rows have valid time
    const invalidRow = results.find(r => r.finishStatus === ParticipationStatus.Finished && (r.finishTimeMs === null || r.finishTimeMs === undefined));
    if (invalidRow) {
      this.resultsError = this.translate.instant('competitions.resultsErrors.invalidTime');
      this.savingResults = false;
      this.cdr.markForCheck();
      return;
    }

    const eventUuid = this.selectedProgressionEventId;

    this.progressionService
      .recordResults(this.competition.uuid, eventUuid, { results, eventStatus: this.saveResultsStatus })
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.savingResults = false;
          this.doCloseResultsEntry(true);
          this.loadTimetable();
          this.loadProgression(true);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.resultsError = err?.error?.message || this.translate.instant('competitions.resultsErrors.saveFailed');
          this.savingResults = false;
          this.cdr.markForCheck();
        },
      });
  }

  formatTimeMs(ms: number): string {
    if (!ms || ms <= 0) return '';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const wholeSec = Math.floor(seconds);
    const centiseconds = Math.round((seconds - wholeSec) * 100);
    return `${minutes.toString().padStart(2, '0')}:${wholeSec.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  parseTimeInput(input: string): number | undefined {
    if (!input || !input.trim()) return undefined;
    const trimmed = input.trim();
    // Match mm:ss.cc or mm:ss or m:ss.cc
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?$/);
    if (!match) return undefined;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centiseconds = match[3] ? parseInt(match[3].padEnd(2, '0'), 10) : 0;
    return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
  }

  getProgressionStatusClass(status: string): string {
    switch (status) {
      case 'finished': return 'text-green-600';
      case 'in_progress': return 'text-bfg-blue font-semibold';
      default: return 'text-gray-500';
    }
  }

  getGenerationStatusIcon(status: string | undefined): string {
    switch (status) {
      case ProgressionGenerationStatus.Success: return 'text-green-600';
      case ProgressionGenerationStatus.Skipped: return 'text-yellow-600';
      case ProgressionGenerationStatus.Error: return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  getGenerationStatusLabel(status: string | undefined): string {
    switch (status) {
      case ProgressionGenerationStatus.Success: return this.translate.instant('competitions.generationStatusLabels.success');
      case ProgressionGenerationStatus.Skipped: return this.translate.instant('competitions.generationStatusLabels.skipped');
      case ProgressionGenerationStatus.Error: return this.translate.instant('competitions.generationStatusLabels.error');
      default: return '-';
    }
  }

  getFinishedEventsForDiscipline(disciplineId: string): ProgressionEventView[] {
    const events = this.timetableEvents.filter(
      e => e.disciplineId === disciplineId &&
        (e.eventStatus === CompetitionEventStatus.OfficialResults
          || e.eventStatus === CompetitionEventStatus.UnofficialResults
          || e.eventStatus === CompetitionEventStatus.InProgress)
    );

    const entryMap = new Map<string, EntryDto>();
    for (const entry of this.clubEntries) {
      if (entry.uuid) entryMap.set(entry.uuid, entry);
    }

    const stageOrder: Record<string, number> = { H: 0, SF: 1, FB: 2, FA: 3 };

    return events
      .sort((a, b) => {
        const sa = stageOrder[a.qualificationEventType ?? ''] ?? 99;
        const sb = stageOrder[b.qualificationEventType ?? ''] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '');
      })
      .map(ev => {
        const participations = this.progressionParticipations
          .filter(p => p.competitionEventId === ev.uuid)
          .sort((a, b) => {
            // Sort by place first (if available), then by lane
            if (a.place && b.place) return a.place - b.place;
            if (a.place) return -1;
            if (b.place) return 1;
            return (a.lane ?? 0) - (b.lane ?? 0);
          })
          .map(p => {
            const entry = p.entryId ? entryMap.get(p.entryId) : null;
            const clubName = entry?.club?.shortName || entry?.club?.name || entry?.clubId || '-';
            const teamNumber = entry?.teamNumber ?? 1;
            const entryLabel = `${clubName} (${teamNumber})`;
            return { ...p, clubName, teamNumber, entryLabel };
          });

        return {
          eventUuid: ev.uuid ?? '',
          eventType: ev.qualificationEventType ?? '',
          eventTypeLabel: this.getEventTypLabel(ev.qualificationEventType),
          eventStatus: ev.eventStatus ?? '',
          eventStatusLabel: this.getEventStatusLabel(ev.eventStatus),
          scheduledAt: ev.scheduledAt,
          participations,
        };
      });
  }

  // ===== FINAL STANDINGS =====

  loadFinalStandings(): void {
    if (!this.competition?.uuid) return;
    this.loadingStandings = true;
    this.standingsError = null;
    this.cdr.markForCheck();
    this.finalStandingsService.getFinalStandings(this.competition.uuid)
      .pipe(
        catchError(err => {
          this.standingsError = err?.error?.message || this.translate.instant('competitions.standingsErrors.loadFailed');
          return of({ standings: [] } as FinalStandingsDto);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.finalStandings = res.standings ?? [];
        this.loadingStandings = false;
        this.cdr.markForCheck();
      });
  }

  standingsForDiscipline(disciplineId: string): CompetitionFinalStandingDto[] {
    return this.finalStandings
      .filter(s => s.disciplineId === disciplineId)
      .sort((a, b) => (a.overallRank ?? 0) - (b.overallRank ?? 0));
  }

  computeAllStandings(): void {
    const ids = this.progressionDisciplines.map(d => d.disciplineId);
    this.computeStandings(ids);
  }

  onGenerateStandingsClick(): void {
    this.standingsSelectionMap = {};
    for (const disc of this.resultsDisciplines) {
      this.standingsSelectionMap[disc.disciplineId] = true;
    }
    this.allStandingsSelected = true;
    this.showStandingsSelectDialog = true;
    this.cdr.markForCheck();
  }

  toggleAllStandingsSelection(): void {
    this.allStandingsSelected = !this.allStandingsSelected;
    for (const disc of this.resultsDisciplines) {
      this.standingsSelectionMap[disc.disciplineId] = this.allStandingsSelected;
    }
    this.cdr.markForCheck();
  }

  toggleStandingsSelection(disciplineId: string): void {
    this.standingsSelectionMap[disciplineId] = !this.standingsSelectionMap[disciplineId];
    this.allStandingsSelected = this.resultsDisciplines.every(
      d => this.standingsSelectionMap[d.disciplineId]
    );
    this.cdr.markForCheck();
  }

  confirmGenerateStandings(): void {
    if (!this.competition?.uuid) return;
    this.computingStandings = true;
    this.showStandingsSelectDialog = false;
    this.cdr.markForCheck();

    const selectedIds = Object.entries(this.standingsSelectionMap)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    this.finalStandingsService.computeFinalStandings(this.competition.uuid, { disciplineIds: selectedIds })
      .pipe(
        catchError(err => {
          this.standingsError = err?.error?.message || this.translate.instant('competitions.standingsErrors.generateFailed');
          return of({ results: [] } as ComputeStandingsResponse);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.standingsGenerateResults = this.sortResultsByFaTime(res.results ?? []);
        this.computingStandings = false;
        this.showStandingsResultsDialog = true;
        this.loadFinalStandings();
        this.cdr.markForCheck();
      });
  }

  computeStandings(disciplineIds: string[]): void {
    if (!this.competition?.uuid) return;
    this.computingStandings = true;
    this.cdr.markForCheck();
    this.finalStandingsService.computeFinalStandings(this.competition.uuid, { disciplineIds })
      .pipe(
        catchError(err => {
          if (disciplineIds.length === 1) {
            this.standingsDisciplineErrors[disciplineIds[0]] = err?.error?.message || this.translate.instant('competitions.standingsErrors.generateSingleFailed');
          } else {
            this.standingsError = err?.error?.message || this.translate.instant('competitions.standingsErrors.generateFailed');
          }
          return of({ results: [] } as ComputeStandingsResponse);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        const results = res.results ?? [];
        for (const r of results) {
          if (r.disciplineId && (r.status === ProgressionGenerationStatus.Error || r.status === ProgressionGenerationStatus.Skipped) && r.reason) {
            this.standingsDisciplineErrors[r.disciplineId] = r.reason;
          } else if (r.disciplineId && r.status === ProgressionGenerationStatus.Success) {
            delete this.standingsDisciplineErrors[r.disciplineId!];
          }
        }
        this.computingStandings = false;
        this.loadFinalStandings();
        this.cdr.markForCheck();
      });
  }

  deleteStandings(disciplineId: string): void {
    if (!this.competition?.uuid) return;
    this.finalStandingsService.deleteFinalStandings(this.competition.uuid, { disciplineIds: [disciplineId] })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.finalStandings = this.finalStandings.filter(s => s.disciplineId !== disciplineId);
          delete this.standingsDisciplineErrors[disciplineId];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.standingsDisciplineErrors[disciplineId] = err?.error?.message || this.translate.instant('competitions.standingsErrors.deleteFailed');
          this.cdr.markForCheck();
        },
      });
  }

  getEntryLabel(entryId: string): string {
    const entry = this.progressionEntries.find(e => e.uuid === entryId);
    if (!entry) return entryId;
    const clubName = entry.club?.shortName || entry.club?.name || entry.clubId || '-';
    return entry.teamNumber && entry.teamNumber > 1
      ? clubName + ' (' + entry.teamNumber + ')'
      : clubName;
  }

  getEntryCrew(entryId: string): { seat: string; cardNumber: string; name: string }[] {
    const entry = this.progressionEntries.find(e => e.uuid === entryId);
    if (!entry || !entry.crewMembers) return [];
    return this.sortCrewMembers(entry.crewMembers).map(cm => ({
      seat: this.SEAT_LABELS[cm.seatPosition || ''] || cm.seatPosition || '?',
      cardNumber: (cm as any).accreditation?.accreditationNumber || '',
      name: (() => {
        const athlete = (cm as any).accreditation?.athlete;
        return athlete ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() : '?';
      })(),
    }));
  }

  // ===== CLUB RANKINGS (COMPLEX STANDINGS) =====

  loadClubRankings(): void {
    if (!this.competition?.uuid) return;
    this.loadingClubRankings = true;
    this.clubRankingsError = null;
    this.cdr.markForCheck();
    this.clubRankingsService.computeClubRankings({ competitionIds: [this.competition.uuid] })
      .pipe(
        catchError(err => {
          this.clubRankingsError = err?.error?.message || this.translate.instant('competitions.standingsErrors.clubRankingsFailed');
          return of({ rankings: [] } as any);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.clubRankings = res.rankings ?? [];
        this.loadingClubRankings = false;
        this.rebuildChart();
        this.cdr.markForCheck();
      });
  }

  get teamRankingGroups(): { id: string; shortName: string }[] {
    const groups = new Map<string, string>();
    for (const club of this.clubRankings) {
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (disc.competitionGroupId && disc.competitionGroupShortName) {
            groups.set(disc.competitionGroupId, disc.competitionGroupShortName);
          }
        }
      }
    }
    return [...groups.entries()]
      .map(([id, shortName]) => ({ id, shortName }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName, 'bg', { numeric: true }));
  }

  get medalSummary(): { rank: number; clubShortName: string; first: number; second: number; third: number }[] {
    const genderFilter = this._chartGender;
    const groupFilter = this._chartGroup;
    const clubData = new Map<string, { first: number; second: number; third: number }>();

    for (const club of this.clubRankings) {
      const clubName = club.clubShortName ?? club.clubName ?? '';
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (disc.rank == null || disc.rank > 3) continue;
          if (genderFilter !== 'ALL' && disc.gender !== genderFilter && disc.gender !== 'MIXED') continue;
          if (groupFilter !== 'ALL' && disc.competitionGroupId !== groupFilter) continue;
          if (!clubData.has(clubName)) clubData.set(clubName, { first: 0, second: 0, third: 0 });
          const counts = clubData.get(clubName)!;
          if (disc.rank === 1) counts.first++;
          else if (disc.rank === 2) counts.second++;
          else if (disc.rank === 3) counts.third++;
        }
      }
    }

    const sorted = [...clubData.entries()]
      .map(([clubShortName, counts]) => ({ clubShortName, ...counts }))
      .sort((a, b) => {
        if (b.first !== a.first) return b.first - a.first;
        if (b.second !== a.second) return b.second - a.second;
        return b.third - a.third;
      });

    const result: { rank: number; clubShortName: string; first: number; second: number; third: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      let rank = i + 1;
      if (i > 0) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.first === curr.first && prev.second === curr.second && prev.third === curr.third) {
          rank = result[i - 1].rank;
        }
      }
      result.push({ ...sorted[i], rank });
    }
    return result;
  }

  private rankWithTiebreaking<T extends { total: number; rankCounts: Map<number, number> }>(
    items: T[]
  ): (T & { rank: number })[] {
    const maxRank = items.reduce((max, item) => {
      item.rankCounts.forEach((_, k) => { if (k > max) max = k; });
      return max;
    }, 0);

    const sorted = [...items].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      for (let r = 1; r <= maxRank; r++) {
        const countA = a.rankCounts.get(r) ?? 0;
        const countB = b.rankCounts.get(r) ?? 0;
        if (countB !== countA) return countB - countA;
      }
      return 0;
    });

    const result: (T & { rank: number })[] = [];
    for (let i = 0; i < sorted.length; i++) {
      let rank = i + 1;
      if (i > 0) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.total === curr.total) {
          let tied = true;
          for (let r = 1; r <= maxRank; r++) {
            if ((prev.rankCounts.get(r) ?? 0) !== (curr.rankCounts.get(r) ?? 0)) { tied = false; break; }
          }
          if (tied) rank = result[i - 1].rank;
        }
      }
      result.push({ ...sorted[i], rank });
    }
    return result;
  }

  teamRankingByGroup(groupId: string, gender: string): { rank: number; clubShortName: string; points: number }[] {
    const clubData = new Map<string, { total: number; rankCounts: Map<number, number> }>();
    for (const club of this.clubRankings) {
      const name = club.clubShortName ?? club.clubName ?? '';
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (disc.competitionGroupId === groupId && (disc.gender === gender || disc.gender === 'MIXED')) {
            if (!clubData.has(name)) clubData.set(name, { total: 0, rankCounts: new Map() });
            const data = clubData.get(name)!;
            data.total += disc.points ?? 0;
            if (disc.rank != null) {
              data.rankCounts.set(disc.rank, (data.rankCounts.get(disc.rank) ?? 0) + 1);
            }
          }
        }
      }
    }

    const items = [...clubData.entries()]
      .map(([name, data]) => ({ clubShortName: name, ...data }))
      .filter(c => c.total > 0);

    return this.rankWithTiebreaking(items)
      .map(c => ({ rank: c.rank, clubShortName: c.clubShortName, points: c.total }));
  }

  teamRankingSummary(gender: string): { rank: number; clubShortName: string; disciplines: Map<string, number>; total: number }[] {
    const clubData = new Map<string, { disciplines: Map<string, number>; rankCounts: Map<number, number> }>();

    for (const club of this.clubRankings) {
      const clubName = club.clubShortName ?? club.clubName ?? '';
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (gender !== 'ALL' && disc.gender !== gender && disc.gender !== 'MIXED') continue;
          const discId = disc.disciplineId ?? '';
          if (!clubData.has(clubName)) clubData.set(clubName, { disciplines: new Map(), rankCounts: new Map() });
          const data = clubData.get(clubName)!;
          data.disciplines.set(discId, (data.disciplines.get(discId) ?? 0) + (disc.points ?? 0));
          if (disc.rank != null) {
            data.rankCounts.set(disc.rank, (data.rankCounts.get(disc.rank) ?? 0) + 1);
          }
        }
      }
    }

    const items = [...clubData.entries()]
      .map(([name, data]) => {
        let total = 0;
        data.disciplines.forEach(v => total += v);
        return { clubShortName: name, disciplines: data.disciplines, rankCounts: data.rankCounts, total };
      })
      .filter(c => c.total > 0);

    return this.rankWithTiebreaking(items)
      .map(c => ({ rank: c.rank, clubShortName: c.clubShortName, disciplines: c.disciplines, total: c.total }));
  }

  teamRankingDisciplines(gender: string): { id: string; shortName: string }[] {
    const discs = new Map<string, string>();
    for (const club of this.clubRankings) {
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (gender !== 'ALL' && disc.gender !== gender && disc.gender !== 'MIXED') continue;
          if (disc.disciplineId && disc.disciplineShortName) {
            discs.set(disc.disciplineId, disc.disciplineShortName);
          }
        }
      }
    }
    return [...discs.entries()]
      .map(([id, shortName]) => ({ id, shortName }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName, 'bg', { numeric: true }));
  }

  // ===== CHARTS =====

  private readonly clubColors = [
    '#6185A8', '#4A6D8C', '#7A9DBF', '#3B5872', '#92B4D2', '#2E4A5F', '#A8C8E0', '#547A99'
  ];

  hiddenDisciplines = new Set<string>();

  toggleChartDiscipline(discId: string): void {
    if (this.hiddenDisciplines.has(discId)) {
      this.hiddenDisciplines.delete(discId);
    } else {
      this.hiddenDisciplines.add(discId);
    }
  }

  get chartBarData(): ChartData<'bar'> {
    if (this.chartView === 'medals') {
      const summary = this.medalSummary;
      const labels = summary.map(r => [`${r.rank}. ${r.clubShortName}`, `${r.first + r.second + r.third} ${this.translate.instant('competitions.chartLabels.medalsAxis')}`]);
      return {
        labels,
        datasets: [
          { label: this.translate.instant('competitions.chartLabels.firstPlace'), data: summary.map(r => r.first), backgroundColor: '#FFD700' },
          { label: this.translate.instant('competitions.chartLabels.secondPlace'), data: summary.map(r => r.second), backgroundColor: '#C0C0C0' },
          { label: this.translate.instant('competitions.chartLabels.thirdPlace'), data: summary.map(r => r.third), backgroundColor: '#CD7F32' },
        ],
      };
    }

    const summary = this.chartSummary;
    const labels = summary.map(r => [`${r.rank}. ${r.clubShortName}`, `${r.total.toFixed(1)} ${this.translate.instant('competitions.chartLabels.pointsAxis')}`]);

    if (this.chartView === 'total') {
      return {
        labels,
        datasets: [{
          label: this.translate.instant('competitions.chartLabels.totalPoints'),
          data: summary.map(r => r.total),
          backgroundColor: '#6185A8',
        }],
      };
    }

    // stacked — one dataset per discipline
    const discs = this.chartDisciplines;
    const datasets = discs.map((d, i) => ({
      label: d.shortName,
      data: summary.map(r => r.disciplines.get(d.id) ?? 0),
      backgroundColor: this.clubColors[i % this.clubColors.length],
    }));
    return { labels, datasets };
  }

  get chartSummary(): { rank: number; clubShortName: string; disciplines: Map<string, number>; total: number }[] {
    const groupFilter = this._chartGroup;
    const genderFilter = this._chartGender;

    const clubData = new Map<string, { disciplines: Map<string, number>; rankCounts: Map<number, number> }>();

    for (const club of this.clubRankings) {
      const clubName = club.clubShortName ?? club.clubName ?? '';
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (genderFilter !== 'ALL' && disc.gender !== genderFilter && disc.gender !== 'MIXED') continue;
          if (groupFilter !== 'ALL' && disc.competitionGroupId !== groupFilter) continue;
          const discId = disc.disciplineId ?? '';
          if (!clubData.has(clubName)) clubData.set(clubName, { disciplines: new Map(), rankCounts: new Map() });
          const data = clubData.get(clubName)!;
          data.disciplines.set(discId, (data.disciplines.get(discId) ?? 0) + (disc.points ?? 0));
          if (disc.rank != null) {
            data.rankCounts.set(disc.rank, (data.rankCounts.get(disc.rank) ?? 0) + 1);
          }
        }
      }
    }

    const items = [...clubData.entries()]
      .map(([name, data]) => {
        let total = 0;
        data.disciplines.forEach(v => total += v);
        return { clubShortName: name, disciplines: data.disciplines, rankCounts: data.rankCounts, total };
      })
      .filter(c => c.total > 0);

    return this.rankWithTiebreaking(items)
      .map(c => ({ rank: c.rank, clubShortName: c.clubShortName, disciplines: c.disciplines, total: c.total }));
  }

  get chartDisciplines(): { id: string; shortName: string }[] {
    const groupFilter = this._chartGroup;
    const genderFilter = this._chartGender;
    const discs = new Map<string, string>();
    for (const club of this.clubRankings) {
      for (const comp of club.competitions ?? []) {
        for (const disc of comp.disciplines ?? []) {
          if (genderFilter !== 'ALL' && disc.gender !== genderFilter && disc.gender !== 'MIXED') continue;
          if (groupFilter !== 'ALL' && disc.competitionGroupId !== groupFilter) continue;
          if (disc.disciplineId && disc.disciplineShortName) {
            discs.set(disc.disciplineId, disc.disciplineShortName);
          }
        }
      }
    }
    return [...discs.entries()]
      .map(([id, shortName]) => ({ id, shortName }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName, 'bg', { numeric: true }));
  }

  get chartBarOptions(): ChartOptions<'bar'> {
    if (this.chartView === 'medals') {
      const summary = this.medalSummary;
      const maxValue = summary.length > 0 ? Math.max(...summary.map(r => r.first + r.second + r.third)) : 10;
      const paddedMax = Math.ceil(maxValue * 1.15);
      return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: { padding: { right: 0 } },
        events: ['mousemove', 'click'],
        plugins: {
          legend: { display: true, position: 'bottom', onClick: () => {} },
          tooltip: { enabled: true },
        },
        scales: {
          x: { stacked: true, beginAtZero: true, suggestedMax: paddedMax, title: { display: true, text: this.translate.instant('competitions.chartLabels.medalsAxis') }, ticks: { stepSize: 1 } },
          y: { stacked: true, grid: { display: false }, ticks: { crossAlign: 'center' } },
        },
      };
    }

    const stacked = this.chartView === 'stacked';
    const summary = this.chartSummary;
    const maxValue = summary.length > 0 ? Math.max(...summary.map(r => r.total)) : 100;
    const paddedMax = Math.ceil(maxValue * 1.12);
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      layout: { padding: { right: 0 } },
      events: ['mousemove', 'click'],
      plugins: {
        legend: { display: stacked, position: 'bottom', onClick: () => {} },
        tooltip: { enabled: true },
      },
      scales: {
        x: { stacked, beginAtZero: true, suggestedMax: paddedMax, title: { display: true, text: this.translate.instant('competitions.chartLabels.pointsAxis') } },
        y: { stacked, grid: { display: false }, ticks: { crossAlign: 'center' } },
      },
    };
  }

  rebuildChart(): void {
    this.cachedChartData = this.chartBarData;
    this.cachedChartOptions = this.chartBarOptions;
  }

  get chartClubLogos(): { name: string; logoUrl: string | undefined }[] {
    const summary = this.chartSummary;
    return summary.map(r => {
      const club = this.clubRankings.find(c => (c.clubShortName ?? c.clubName) === r.clubShortName);
      return { name: r.clubShortName, logoUrl: club?.clubLogoUrl };
    });
  }

  get medalClubLogos(): { name: string; logoUrl: string | undefined }[] {
    const summary = this.medalSummary;
    return summary.map(r => {
      const club = this.clubRankings.find(c => (c.clubShortName ?? c.clubName) === r.clubShortName);
      return { name: r.clubShortName, logoUrl: club?.clubLogoUrl };
    });
  }

  private logoImageCache = new Map<string, HTMLImageElement>();

  private getLogoImage(url: string): HTMLImageElement {
    if (!this.logoImageCache.has(url)) {
      const img = new Image();
      img.src = url;
      this.logoImageCache.set(url, img);
    }
    return this.logoImageCache.get(url)!;
  }

  chartPlugins: Plugin<'bar'>[] = [{
    id: 'clubLogos',
    afterDatasetsDraw: (chart) => {
      const logos = this.chartView === 'medals' ? this.medalClubLogos : this.chartClubLogos;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;

      const ctx = chart.ctx;
      const datasetCount = chart.data.datasets.length;

      meta.data.forEach((bar, i) => {
        if (i >= logos.length) return;
        const logoUrl = logos[i].logoUrl || 'assets/images/default-club.png';
        const img = this.getLogoImage(logoUrl);

        let x = (bar as any).x;
        if (datasetCount > 1) {
          const lastMeta = chart.getDatasetMeta(datasetCount - 1);
          if (lastMeta?.data?.[i]) {
            x = (lastMeta.data[i] as any).x;
          }
        }
        const y = (bar as any).y;
        const size = (bar as any).height;

        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + size / 2 + 4, y, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x + 4, y - size / 2, size, size);
          ctx.restore();
        }
      });
    }
  }];

  // ===== CHRONOMETER =====

  getOrCreateChronoState(eventUuid: string): ChronoState {
    if (!this.chronoStates.has(eventUuid)) {
      this.chronoStates.set(eventUuid, {
        eventUuid,
        phase: 'waiting',
        startedAt: null,
        stoppedAt: null,
        elapsedMs: 0,
        splits: [],
      });
    }
    return this.chronoStates.get(eventUuid)!;
  }

  get currentChronoState(): ChronoState | null {
    if (!this.selectedProgressionEventId) return null;
    return this.chronoStates.get(this.selectedProgressionEventId) ?? null;
  }

  get isChronoRunning(): boolean {
    return this.currentChronoState?.phase === 'running';
  }

  get chronoEventLanes(): number[] {
    return this.resultEdits.map(r => r.lane).filter(l => l > 0);
  }

  openChronoStart(): void {
    if (!this.selectedProgressionEventId) return;
    this.getOrCreateChronoState(this.selectedProgressionEventId);
    this.chronoDialogMode = 'start';
    this.chronoDialogOpen = true;
    this.cdr.markForCheck();
  }

  openChronoFinish(): void {
    if (!this.selectedProgressionEventId) return;
    this.chronoDialogMode = 'finish';
    this.chronoDialogOpen = true;
    this.cdr.markForCheck();
  }

  onChronoStarted(): void {
    this.cdr.markForCheck();
  }

  onChronoClosed(): void {
    this.chronoDialogOpen = false;
    this.cdr.markForCheck();
  }

  onChronoResultsApplied(result: ChronoResult): void {
    for (const lr of result.laneResults) {
      const row = this.resultEdits.find(r => r.lane === lr.lane);
      if (row) {
        row.finishStatus = ParticipationStatus.Finished;
        row.timeInput = this.formatTimeMs(lr.finishTimeMs);
      }
    }
    this.chronoDialogOpen = false;
    this.cdr.markForCheck();
  }

  closeResultsEntry(): void {
    if (this.isChronoRunning) {
      this.showChronoStopConfirm = true;
      this.cdr.markForCheck();
      return;
    }
    this.doCloseResultsEntry();
  }

  confirmChronoStop(): void {
    if (this.selectedProgressionEventId) {
      this.chronoStates.delete(this.selectedProgressionEventId);
    }
    this.showChronoStopConfirm = false;
    this.chronoDialogOpen = false;
    this.doCloseResultsEntry();
  }

  cancelChronoStop(): void {
    this.showChronoStopConfirm = false;
    this.cdr.markForCheck();
  }

  private doCloseResultsEntry(preserveDay = false): void {
    if (this.selectedProgressionEventId) {
      this.chronoStates.delete(this.selectedProgressionEventId);
    }
    this.selectedProgressionEventId = null;
    if (!preserveDay) {
      this.selectedStartListDay = null;
    }
    this.eventParticipations = [];
    this.resultEdits = [];
    this.resultsError = null;
    this.cdr.markForCheck();
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
      awardingCeremonyAt: this.competition.awardingCeremonyAt as any,
      scoringSchemeId: this.competition.scoringSchemeId,
      qualificationSchemeId: this.competition.qualificationSchemeId,
      competitionType: this.competition.competitionType as CompetitionType,
    };
    this.isEditing = true;
    this.touched = {};
    this.editError = null;
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.touched = {};
    this.editError = null;
    this.cdr.markForCheck();
  }

  get isEditFormValid(): boolean {
    return !!this.editData.shortName?.trim()
      && !!this.editData.name?.trim()
      && !!this.editData.startDate
      && !!this.editData.endDate;
  }

  // ===== DELETE COMPETITION =====
  showDeleteCompetitionConfirm = false;
  deleteCompetitionError: string | null = null;
  deletingCompetition = false;

  confirmDeleteCompetition(): void {
    this.showDeleteCompetitionConfirm = true;
    this.deleteCompetitionError = null;
    this.cdr.markForCheck();
  }

  cancelDeleteCompetition(): void {
    this.showDeleteCompetitionConfirm = false;
    this.deleteCompetitionError = null;
    this.cdr.markForCheck();
  }

  deleteCompetition(): void {
    if (!this.competition?.uuid) return;
    this.deletingCompetition = true;
    this.cdr.markForCheck();
    this.competitionsService.deleteCompetitionByUuid(this.competition.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/competitions']);
        },
        error: (err) => {
          this.deletingCompetition = false;
          this.deleteCompetitionError = err?.error?.message || this.translate.instant('competitions.deleteErrors.competitionFailed');
          this.cdr.markForCheck();
        },
      });
  }

  private appendZ(val: any): any {
    if (!val) return val;
    const s = String(val);
    return s.endsWith('Z') || s.includes('+') ? s : s + 'Z';
  }

  saveEditing(): void {
    if (!this.competition?.uuid) return;

    this.touched['shortName'] = true;
    this.touched['name'] = true;

    if (!this.isEditFormValid) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.editError = null;
    this.cdr.markForCheck();

    const request: CompetitionUpdateRequest = {
      ...(this.editData as CompetitionUpdateRequest),
      shortName: this.editData.shortName?.trim() || '',
      name: this.editData.name?.trim() || '',
      location: this.editData.location?.trim() || '',
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
      awardingCeremonyAt: this.competition.isTemplate ? undefined
        : (this.editData.awardingCeremonyAt ? this.appendZ(this.editData.awardingCeremonyAt) as any : undefined),
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
          this.editError = err?.error?.message || this.translate.instant('competitions.editErrors.saveFailed');
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

  disciplineSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.disciplineDefinitionsService.getAllDisciplineDefinitions(
        undefined, undefined, ['shortName_asc'] as any, top, skip
      ) as any
    ).pipe(map((items: any[]) => items.map((d: any) => ({
      value: d.uuid || '',
      label: `${d.shortName || d.name || d.uuid}`,
      disabled: !d.isActive,
    }))));

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
          this.timetableError = err?.error?.message || this.translate.instant('competitions.timetableErrors.saveFailed');
          this.savingTimetable = false;
          this.cdr.markForCheck();
        },
      });
  }

  confirmDeleteTimetableEvent(event: CompetitionTimetableEventDto): void {
    this.timetableEventToDelete = event;
    this.showDeleteTimetableConfirm = true;
    this.deleteTimetableError = null;
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
          this.editTimetableError = err?.error?.message || this.translate.instant('competitions.timetableErrors.saveFailed');
          this.savingTimetable = false;
          this.cdr.markForCheck();
        },
      });
  }

  cancelDeleteTimetableEvent(): void {
    this.timetableEventToDelete = null;
    this.showDeleteTimetableConfirm = false;
    this.deleteTimetableError = null;
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
          this.deleteTimetableError = null;
          this.loadTimetable();
        },
        error: (err) => {
          this.deleteTimetableError = err?.error?.message || this.translate.instant('competitions.timetableErrors.deleteFailed');
          this.cdr.markForCheck();
        },
      });
  }

  private readonly SEAT_SORT_ORDER: Record<string, number> = {
    BOW: 0, TWO: 1, THREE: 2, FOUR: 3, FIVE: 4, SIX: 5, SEVEN: 6, STROKE: 7, COX: 8,
  };

  sortCrewMembers(crewMembers: any[]): any[] {
    return [...crewMembers].sort((a, b) =>
      (this.SEAT_SORT_ORDER[a.seatPosition] ?? 99) - (this.SEAT_SORT_ORDER[b.seatPosition] ?? 99)
    );
  }

  getDisciplineNameById(disciplineId: string | undefined): string {
    if (!disciplineId) return '-';
    const d = this.timetableDisciplines.find((d) => d.disciplineId === disciplineId);
    return d ? d.label : disciplineId;
  }

  getEventTypLabel(type: string | undefined): string {
    const labels: Record<string, string> = {
      H: this.translate.instant('competitions.eventTypeMap.H'),
      SF: this.translate.instant('competitions.eventTypeMap.SF'),
      FB: this.translate.instant('competitions.eventTypeMap.FB'),
      FA: this.translate.instant('competitions.eventTypeMap.FA'),
    };
    return type ? (labels[type] ?? type) : '-';
  }

  getEventStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      SCHEDULED: this.translate.instant('competitions.eventStatusMap.SCHEDULED'),
      IN_PROGRESS: this.translate.instant('competitions.eventStatusMap.IN_PROGRESS'),
      UNOFFICIAL_RESULTS: this.translate.instant('competitions.eventStatusMap.UNOFFICIAL_RESULTS'),
      OFFICIAL_RESULTS: this.translate.instant('competitions.eventStatusMap.OFFICIAL_RESULTS'),
      CANCELLED: this.translate.instant('competitions.eventStatusMap.CANCELLED'),
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
      [CompetitionType.NationalErgo]: this.translate.instant('competitions.competitionType.nationalErgo'),
      [CompetitionType.NationalWater]: this.translate.instant('competitions.competitionType.nationalWater'),
      [CompetitionType.Balkan]: this.translate.instant('competitions.competitionType.balkan'),
    };
    return type ? (labels[type] ?? type) : '-';
  }

  getStatusLabel(status: string | null | undefined): string {
    const key = status ? (STATUS_LABELS[status as ComputedCompetitionStatus] ?? null) : null;
    return key ? this.translate.instant(key) : '-';
  }

  getStatusClass(status: string | null | undefined): string {
    return status ? (STATUS_CLASSES[status as ComputedCompetitionStatus] ?? 'text-gray-900') : 'text-gray-900';
  }

  getComputedStatus(): string | null {
    return this.competition ? computeCompetitionStatus(this.competition) : null;
  }

  exportStartListPdf(): void {
    if (!this.competition) return;

    const days = this.startListDays;
    const activeDay = days.find(d => d.key === this.activeStartListDay);
    const dayLabel = activeDay?.label || this.activeStartListDay;

    const events: StartListPdfEvent[] = this.filteredStartListEvents.map(ev => ({
      scheduledAt: ev.scheduledAt,
      disciplineLabel: ev.disciplineLabel,
      eventTypeLabel: ev.eventTypeLabel,
      eventNumber: ev.eventNumber,
      showNumber: ev.showNumber,
      participations: ev.participations.map(p => ({
        lane: p.lane,
        clubName: p.clubName,
        teamNumber: p.teamNumber,
        crew: p.crew.map(c => ({ seat: c.seat, name: c.name })),
      })),
    }));

    generateStartListPdf({
      competitionName: this.competition.name || this.competition.shortName || '',
      location: this.competition.location || '',
      dayLabel,
      events,
      labels: {
        tableHeaders: [
          this.translate.instant('competitions.pdf.startList.lane'),
          this.translate.instant('competitions.pdf.startList.club'),
          this.translate.instant('competitions.pdf.startList.crew'),
        ],
      },
    });
  }

  get hasAnyStandings(): boolean {
    return this.finalStandings.length > 0;
  }

  exportResultsPdf(): void {
    if (!this.competition) return;

    const disciplines: ResultsPdfDiscipline[] = this.resultsDisciplines
      .filter(disc => this.standingsForDiscipline(disc.disciplineId).length > 0)
      .map(disc => {
        const standings = this.standingsForDiscipline(disc.disciplineId);
        return {
          label: disc.label,
          standings: standings.map(s => ({
            rank: s.overallRank ?? null,
            clubLabel: this.getEntryLabel(s.entryId!),
            crew: this.getEntryCrew(s.entryId!).map(c => ({ seat: c.seat, name: c.name })),
            time: s.timeMs != null ? this.formatTimeMs(s.timeMs) : '',
            points: s.points ?? null,
          })),
        };
      });

    generateResultsPdf({
      competitionName: this.competition.name || this.competition.shortName || '',
      location: this.competition.location || '',
      disciplines,
      labels: {
        subtitle: this.translate.instant('competitions.pdf.results.subtitle'),
        tableHeaders: [
          this.translate.instant('competitions.pdf.results.rank'),
          this.translate.instant('competitions.pdf.results.club'),
          this.translate.instant('competitions.pdf.results.crew'),
          this.translate.instant('competitions.pdf.results.time'),
          this.translate.instant('competitions.pdf.results.points'),
        ],
        filenameSuffix: this.translate.instant('competitions.pdf.results.filenameSuffix'),
      },
    });
  }

  exportWeighInPdf(): void {
    if (!this.competition) return;

    const days = this.weighInDays;
    const activeDay = days.find(d => d.key === this.activeWeighInDay);
    const dayLabel = activeDay?.label || this.activeWeighInDay;

    const events: WeighInPdfEvent[] = this.weighInEventGroups.map(group => ({
      scheduledAt: group.scheduledAt,
      disciplineLabel: group.disciplineLabel,
      eventTypeLabel: group.eventTypeLabel,
      eventNumber: group.eventNumber,
      showNumber: group.showNumber,
      crews: group.crews.map(crew => ({
        clubName: crew.clubName,
        teamNumber: crew.teamNumber,
        athletes: crew.athletes.map(a => ({
          seat: a.seat,
          name: a.name,
          cardNumber: a.cardNumber,
          roleLabel: a.roleLabel,
          weightLimit: a.weightLimit,
          weightKg: a.weightKg,
          comment: a.comment,
        })),
      })),
    }));

    generateWeighInPdf({
      competitionName: this.competition.name || this.competition.shortName || '',
      location: this.competition.location || '',
      dayLabel,
      events,
      labels: {
        subtitle: this.translate.instant('competitions.pdf.weighIn.subtitle'),
        tableHeaders: [
          this.translate.instant('competitions.pdf.weighIn.athlete'),
          this.translate.instant('competitions.pdf.weighIn.card'),
          this.translate.instant('competitions.pdf.weighIn.role'),
          this.translate.instant('competitions.pdf.weighIn.limit'),
          this.translate.instant('competitions.pdf.weighIn.weight'),
          this.translate.instant('competitions.pdf.weighIn.comment'),
        ],
        weightUnit: this.translate.instant('competitions.pdf.weighIn.weightUnit'),
        filenameSuffix: this.translate.instant('competitions.pdf.weighIn.filenameSuffix'),
      },
    });
  }
}
