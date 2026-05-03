import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, timeout } from 'rxjs';

import { fetchAllPages } from '../../core/utils/fetch-all-pages';
import { HeaderComponent } from '../../layout/header/header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AuthService } from '../../core/services/auth.service';
import { SystemRole } from '../../core/models/navigation.model';

// Competition Groups
import {
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionDto,
} from '../../core/services/api';
import { CompetitionGroupsTableComponent } from '../competition-groups/components/competition-groups-table/competition-groups-table.component';
import { AddCompetitionGroupDialogComponent } from '../competition-groups/components/add-competition-group-dialog/add-competition-group-dialog.component';
import { CompetitionGroupsSettingsDialogComponent } from '../competition-groups/components/competition-groups-settings-dialog/competition-groups-settings-dialog.component';
import { CompetitionGroupsFiltersComponent } from '../competition-groups/components/competition-groups-filters/competition-groups-filters.component';
import { CompetitionGroupFilters, ColumnConfig, FilterConfig } from '../competition-groups/competition-groups.component';

// Disciplines
import {
  DisciplineDefinitionsService,
  DisciplineDefinitionDto,
} from '../../core/services/api';
import { DisciplinesTableComponent } from '../disciplines/components/disciplines-table/disciplines-table.component';
import { AddDisciplineDialogComponent } from '../disciplines/components/add-discipline-dialog/add-discipline-dialog.component';
import { DisciplinesSettingsDialogComponent } from '../disciplines/components/disciplines-settings-dialog/disciplines-settings-dialog.component';
import { DisciplinesFiltersComponent } from '../disciplines/components/disciplines-filters/disciplines-filters.component';
import { DisciplineFilters, DisciplineColumnConfig, DisciplineFilterConfig } from '../disciplines/disciplines.component';

// Scoring
import {
  ScoringSchemesService,
  ScoringSchemeDto,
} from '../../core/services/api';
import { ScoringTableComponent } from '../scoring/components/scoring-table/scoring-table.component';
import { AddScoringDialogComponent } from '../scoring/components/add-scoring-dialog/add-scoring-dialog.component';
import { ScoringSettingsDialogComponent } from '../scoring/components/scoring-settings-dialog/scoring-settings-dialog.component';
import { ScoringFiltersComponent } from '../scoring/components/scoring-filters/scoring-filters.component';
import { ScoringFilters, ScoringColumnConfig, ScoringFilterConfig } from '../scoring/scoring.component';

// Qualification
import {
  QualificationSchemesService,
  QualificationSchemeDto,
} from '../../core/services/api';
import { QualificationTableComponent } from '../qualification/components/qualification-table/qualification-table.component';
import { AddQualificationDialogComponent } from '../qualification/components/add-qualification-dialog/add-qualification-dialog.component';
import { QualificationSettingsDialogComponent } from '../qualification/components/qualification-settings-dialog/qualification-settings-dialog.component';
import { QualificationFiltersComponent } from '../qualification/components/qualification-filters/qualification-filters.component';
import { QualificationFilters, QualificationColumnConfig, QualificationFilterConfig } from '../qualification/qualification.component';
import { DropdownOption } from '../../shared/components/multi-select-dropdown/multi-select-dropdown.component';

type RulesTab = 'groups' | 'disciplines' | 'scoring' | 'qualification';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    ButtonComponent,
    // Groups
    CompetitionGroupsTableComponent,
    AddCompetitionGroupDialogComponent,
    CompetitionGroupsSettingsDialogComponent,
    CompetitionGroupsFiltersComponent,
    // Disciplines
    DisciplinesTableComponent,
    AddDisciplineDialogComponent,
    DisciplinesSettingsDialogComponent,
    DisciplinesFiltersComponent,
    // Scoring
    ScoringTableComponent,
    AddScoringDialogComponent,
    ScoringSettingsDialogComponent,
    ScoringFiltersComponent,
    // Qualification
    QualificationTableComponent,
    AddQualificationDialogComponent,
    QualificationSettingsDialogComponent,
    QualificationFiltersComponent,
  ],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: RulesTab = 'groups';
  userRole: SystemRole | null = null;

  readonly pageSize = 50;

  // ===== GROUPS =====
  groups: CompetitionGroupDefinitionDto[] = [];
  groupsTotalElements = 0;
  groupsLoading = false;
  groupsError: string | null = null;
  groupsSkip = 0;
  groupsHasMore = true;
  groupsLoaded = false;
  groupLookup: Record<string, string> = {};

  groupFilters: CompetitionGroupFilters = { search: '', statuses: [] };
  groupOrderBy: string[] = ['name_asc'];

  groupColumns: ColumnConfig[] = [
    { id: 'name', label: 'Име', visible: true },
    { id: 'shortName', label: 'Кратко име', visible: true },
    { id: 'minAge', label: 'Мин. възраст', visible: true },
    { id: 'maxAge', label: 'Макс. възраст', visible: true },
    { id: 'coxMinAge', label: 'Рулеви мин. възраст', visible: false },
    { id: 'coxMaxAge', label: 'Рулеви макс. възраст', visible: false },
    { id: 'maxDisciplinesPerAthlete', label: 'Макс. дисциплини', visible: true },
    { id: 'transferFromGroupId', label: 'Трансфер от група', visible: true },
    { id: 'minCrewForTransfer', label: 'Мин. екипаж', visible: true },
    { id: 'transferRatio', label: 'Съотношение', visible: true },
    { id: 'transferRounding', label: 'Закръгляне', visible: true },
    { id: 'transferredMaxDisciplinesPerAthlete', label: 'Макс. дисц. (трансф.)', visible: true },
    { id: 'maleTeamCoxRequiredWeightKg', label: 'М. рулеви изискв. тегло', visible: true },
    { id: 'maleTeamCoxMinWeightKg', label: 'М. рулеви мин. тегло', visible: true },
    { id: 'maleTeamLightMaxWeightKg', label: 'М. лек макс. тегло', visible: true },
    { id: 'femaleTeamCoxRequiredWeightKg', label: 'Ж. рулеви изискв. тегло', visible: true },
    { id: 'femaleTeamCoxMinWeightKg', label: 'Ж. рулеви мин. тегло', visible: true },
    { id: 'femaleTeamLightMaxWeightKg', label: 'Ж. лек макс. тегло', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  groupFilterConfigs: FilterConfig[] = [
    { id: 'status', label: 'Статус', visible: true },
  ];

  isGroupAddOpen = false;
  isGroupSettingsOpen = false;

  // ===== DISCIPLINES =====
  disciplines: DisciplineDefinitionDto[] = [];
  disciplinesTotalElements = 0;
  disciplinesLoading = false;
  disciplinesError: string | null = null;
  disciplinesSkip = 0;
  disciplinesHasMore = true;
  disciplinesLoaded = false;

  disciplineFilters: DisciplineFilters = { search: '', boatClasses: [], statuses: [], competitionGroupIds: [] };
  disciplineOrderBy: string[] = ['name_asc'];

  disciplineColumns: DisciplineColumnConfig[] = [
    { id: 'name', label: 'Ime', visible: true },
    { id: 'shortName', label: 'Кратко ime', visible: true },
    { id: 'competitionGroup', label: 'Състезателна група', visible: true },
    { id: 'boatClass', label: 'Клас лодка', visible: true },
    { id: 'crewSize', label: 'Размер екипаж', visible: true },
    { id: 'maxCrewFromTransfer', label: 'Макс. прехвърлени', visible: true },
    { id: 'hasCoxswain', label: 'Кокс', visible: true },
    { id: 'isLightweight', label: 'Лековес', visible: true },
    { id: 'distanceMeters', label: 'Дистанция (м)', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  disciplineFilterConfigs: DisciplineFilterConfig[] = [
    { id: 'competitionGroup', label: 'Състезателна група', visible: true },
    { id: 'boatClass', label: 'Клас лодка', visible: true },
    { id: 'status', label: 'Статус', visible: true },
  ];

  disciplineGroupOptions: DropdownOption[] = [];

  isDisciplineAddOpen = false;
  isDisciplineSettingsOpen = false;

  // ===== SCORING =====
  scoringSchemes: ScoringSchemeDto[] = [];
  scoringTotalElements = 0;
  scoringLoading = false;
  scoringError: string | null = null;
  scoringSkip = 0;
  scoringHasMore = true;
  scoringLoaded = false;

  scoringFilters: ScoringFilters = { search: '', scoringTypes: [], statuses: [] };
  scoringOrderBy: string[] = ['name_asc'];

  scoringColumns: ScoringColumnConfig[] = [
    { id: 'name', label: 'Ime', visible: true },
    { id: 'scoringType', label: 'Тип', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  scoringFilterConfigs: ScoringFilterConfig[] = [
    { id: 'scoringType', label: 'Тип', visible: true },
    { id: 'status', label: 'Статус', visible: true },
  ];

  isScoringAddOpen = false;
  isScoringSettingsOpen = false;

  // ===== QUALIFICATION =====
  qualificationSchemes: QualificationSchemeDto[] = [];
  qualificationTotalElements = 0;
  qualificationLoading = false;
  qualificationError: string | null = null;
  qualificationSkip = 0;
  qualificationHasMore = true;
  qualificationLoaded = false;

  qualificationFilters: QualificationFilters = { search: '', statuses: [] };
  qualificationOrderBy: string[] = ['name_asc'];

  qualificationColumns: QualificationColumnConfig[] = [
    { id: 'name', label: 'Ime', visible: true },
    { id: 'laneCount', label: 'Коридори', visible: true },
    { id: 'isActive', label: 'Статус', visible: true },
    { id: 'createdAt', label: 'Създаден на', visible: true },
    { id: 'modifiedAt', label: 'Променен на', visible: true },
  ];

  qualificationFilterConfigs: QualificationFilterConfig[] = [
    { id: 'status', label: 'Статус', visible: true },
  ];

  isQualificationAddOpen = false;
  isQualificationSettingsOpen = false;

  constructor(
    private authService: AuthService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private scoringSchemesService: ScoringSchemesService,
    private qualificationSchemesService: QualificationSchemesService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && user.roles.length > 0) {
      this.userRole = user.roles[0] as SystemRole;
    }

    this.loadSettings();

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const tab = params.get('tab') as RulesTab | null;

      if (tab && this.isValidTab(tab)) {
        if (this.activeTab !== tab) {
          this.activeTab = tab;
        }
        this.triggerTabLoad(this.activeTab);
        this.cdr.markForCheck();
      } else {
        this.router.navigate(['/regulations', this.activeTab], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return this.userRole === SystemRole.AppAdmin || this.userRole === SystemRole.FederationAdmin;
  }

  readonly tabs: { id: RulesTab; label: string }[] = [
    { id: 'groups', label: 'Състезателни групи' },
    { id: 'disciplines', label: 'Дисциплини' },
    { id: 'scoring', label: 'Схеми за точкуване' },
    { id: 'qualification', label: 'Квалификационни схеми' },
  ];

  setTab(tab: RulesTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.router.navigate(['/regulations', tab], { replaceUrl: true });
    this.triggerTabLoad(tab);
    this.cdr.markForCheck();
  }

  private isValidTab(tab: string): tab is RulesTab {
    return ['groups', 'disciplines', 'scoring', 'qualification'].includes(tab);
  }

  private triggerTabLoad(tab: RulesTab): void {
    if (tab === 'groups' && !this.groupsLoaded) {
      this.loadGroupLookup();
      this.loadGroups();
    }
    if (tab === 'disciplines' && !this.disciplinesLoaded) {
      this.loadGroupLookup();
      this.loadDisciplines();
    }
    if (tab === 'scoring' && !this.scoringLoaded) this.loadScoringSchemes();
    if (tab === 'qualification' && !this.qualificationLoaded) this.loadQualificationSchemes();
  }

  // ===== GROUPS METHODS =====

  private loadGroupLookup(): void {
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
        undefined, undefined, ['shortName_asc'] as any, top, skip
      ) as any
    ).pipe(takeUntil(this.destroy$)).subscribe((groups: any[]) => {
      const lookup: Record<string, string> = {};
      const options: DropdownOption[] = [];
      groups.forEach((g: any) => {
        lookup[g.uuid] = `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`;
        options.push({ value: g.uuid, label: g.shortName || g.name || '-' });
      });
      this.groupLookup = lookup;
      this.disciplineGroupOptions = options;
      this.cdr.markForCheck();
    });
  }

  loadGroups(reset = true): void {
    if (reset) { this.groupsSkip = 0; this.groups = []; this.groupsHasMore = true; }
    if (this.groupsLoading) return;
    this.groupsLoading = true;
    this.groupsError = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];
    if (this.groupFilters.statuses.length > 0) {
      filterParts.push(this.groupFilters.statuses.length === 1
        ? `isActive eq ${this.groupFilters.statuses[0]}`
        : `(${this.groupFilters.statuses.map(s => `isActive eq ${s}`).join(' or ')})`);
    }

    this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
      filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      this.groupFilters.search || undefined,
      this.groupOrderBy as any,
      this.pageSize,
      this.groupsSkip,
    ).pipe(
      timeout(30000),
      catchError((err) => {
        this.groupsError = err?.error?.message || 'Грешка при зареждане';
        this.groupsLoading = false;
        this.cdr.markForCheck();
        return of({ content: [], totalElements: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe((response: any) => {
      this.groups = reset ? (response.content || []) : [...this.groups, ...(response.content || [])];
      this.groupsTotalElements = response.totalElements || 0;
      this.groupsHasMore = this.groups.length < this.groupsTotalElements;
      this.groupsLoading = false;
      this.groupsLoaded = true;
      this.cdr.markForCheck();
    });
  }

  onGroupFiltersChange(filters: CompetitionGroupFilters): void {
    this.groupFilters = { ...filters };
    this.loadGroups();
  }

  onGroupSortChange(orderBy: string[]): void {
    this.groupOrderBy = orderBy;
    this.loadGroups();
  }

  openGroupDetails(group: CompetitionGroupDefinitionDto): void {
    this.router.navigate(['/regulations', 'groups', group.uuid]);
  }

  onGroupAdded(): void {
    this.isGroupAddOpen = false;
    this.loadGroups();
    this.cdr.markForCheck();
  }

  onGroupSettingsChange(data: { columns: ColumnConfig[]; filterConfigs: FilterConfig[] }): void {
    this.groupColumns = data.columns;
    this.groupFilterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  // ===== DISCIPLINES METHODS =====

  loadDisciplines(reset = true): void {
    if (reset) { this.disciplinesSkip = 0; this.disciplines = []; this.disciplinesHasMore = true; }
    if (this.disciplinesLoading) return;
    this.disciplinesLoading = true;
    this.disciplinesError = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];
    if (this.disciplineFilters.boatClasses.length > 0) {
      filterParts.push(this.disciplineFilters.boatClasses.length === 1
        ? `boatClass eq '${this.disciplineFilters.boatClasses[0]}'`
        : `(${this.disciplineFilters.boatClasses.map(b => `boatClass eq '${b}'`).join(' or ')})`);
    }
    if (this.disciplineFilters.statuses.length > 0) {
      filterParts.push(this.disciplineFilters.statuses.length === 1
        ? `isActive eq ${this.disciplineFilters.statuses[0]}`
        : `(${this.disciplineFilters.statuses.map(s => `isActive eq ${s}`).join(' or ')})`);
    }
    if (this.disciplineFilters.competitionGroupIds.length > 0) {
      filterParts.push(this.disciplineFilters.competitionGroupIds.length === 1
        ? `competitionGroupId eq '${this.disciplineFilters.competitionGroupIds[0]}'`
        : `(${this.disciplineFilters.competitionGroupIds.map(id => `competitionGroupId eq '${id}'`).join(' or ')})`);
    }

    this.disciplineDefinitionsService.getAllDisciplineDefinitions(
      filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      this.disciplineFilters.search || undefined,
      this.disciplineOrderBy as any,
      this.pageSize,
      this.disciplinesSkip,
    ).pipe(
      timeout(30000),
      catchError((err) => {
        this.disciplinesError = err?.error?.message || 'Грешка при зареждане';
        this.disciplinesLoading = false;
        this.cdr.markForCheck();
        return of({ content: [], totalElements: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe((response: any) => {
      this.disciplines = reset ? (response.content || []) : [...this.disciplines, ...(response.content || [])];
      this.disciplinesTotalElements = response.totalElements || 0;
      this.disciplinesHasMore = this.disciplines.length < this.disciplinesTotalElements;
      this.disciplinesLoading = false;
      this.disciplinesLoaded = true;
      this.cdr.markForCheck();
    });
  }

  onDisciplineFiltersChange(filters: DisciplineFilters): void {
    this.disciplineFilters = { ...filters };
    this.loadDisciplines();
  }

  onDisciplineSortChange(orderBy: string[]): void {
    this.disciplineOrderBy = orderBy;
    this.loadDisciplines();
  }

  openDisciplineDetails(discipline: DisciplineDefinitionDto): void {
    this.router.navigate(['/regulations', 'disciplines', discipline.uuid]);
  }

  onDisciplineAdded(): void {
    this.isDisciplineAddOpen = false;
    this.loadDisciplines();
    this.cdr.markForCheck();
  }

  onDisciplineSettingsChange(data: { columns: DisciplineColumnConfig[]; filterConfigs: DisciplineFilterConfig[] }): void {
    this.disciplineColumns = data.columns;
    this.disciplineFilterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  // ===== SCORING METHODS =====

  loadScoringSchemes(reset = true): void {
    if (reset) { this.scoringSkip = 0; this.scoringSchemes = []; this.scoringHasMore = true; }
    if (this.scoringLoading) return;
    this.scoringLoading = true;
    this.scoringError = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];
    if (this.scoringFilters.scoringTypes.length > 0) {
      filterParts.push(this.scoringFilters.scoringTypes.length === 1
        ? `scoringType eq '${this.scoringFilters.scoringTypes[0]}'`
        : `(${this.scoringFilters.scoringTypes.map(t => `scoringType eq '${t}'`).join(' or ')})`);
    }
    if (this.scoringFilters.statuses.length > 0) {
      filterParts.push(this.scoringFilters.statuses.length === 1
        ? `isActive eq ${this.scoringFilters.statuses[0]}`
        : `(${this.scoringFilters.statuses.map(s => `isActive eq ${s}`).join(' or ')})`);
    }

    this.scoringSchemesService.getAllScoringSchemes(
      filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      this.scoringFilters.search || undefined,
      this.scoringOrderBy as any,
      this.pageSize,
      this.scoringSkip,
    ).pipe(
      timeout(30000),
      catchError((err) => {
        this.scoringError = err?.error?.message || 'Грешка при зареждане';
        this.scoringLoading = false;
        this.cdr.markForCheck();
        return of({ content: [], totalElements: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe((response: any) => {
      this.scoringSchemes = reset ? (response.content || []) : [...this.scoringSchemes, ...(response.content || [])];
      this.scoringTotalElements = response.totalElements || 0;
      this.scoringHasMore = this.scoringSchemes.length < this.scoringTotalElements;
      this.scoringLoading = false;
      this.scoringLoaded = true;
      this.cdr.markForCheck();
    });
  }

  onScoringFiltersChange(filters: ScoringFilters): void {
    this.scoringFilters = { ...filters };
    this.loadScoringSchemes();
  }

  onScoringSortChange(orderBy: string[]): void {
    this.scoringOrderBy = orderBy;
    this.loadScoringSchemes();
  }

  openScoringDetails(scheme: ScoringSchemeDto): void {
    this.router.navigate(['/regulations', 'scoring', scheme.uuid]);
  }

  onScoringAdded(): void {
    this.isScoringAddOpen = false;
    this.loadScoringSchemes();
    this.cdr.markForCheck();
  }

  onScoringSettingsChange(data: { columns: ScoringColumnConfig[]; filterConfigs: ScoringFilterConfig[] }): void {
    this.scoringColumns = data.columns;
    this.scoringFilterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  // ===== QUALIFICATION METHODS =====

  loadQualificationSchemes(reset = true): void {
    if (reset) { this.qualificationSkip = 0; this.qualificationSchemes = []; this.qualificationHasMore = true; }
    if (this.qualificationLoading) return;
    this.qualificationLoading = true;
    this.qualificationError = null;
    this.cdr.markForCheck();

    const filterParts: string[] = [];
    if (this.qualificationFilters.statuses.length > 0) {
      filterParts.push(this.qualificationFilters.statuses.length === 1
        ? `isActive eq ${this.qualificationFilters.statuses[0]}`
        : `(${this.qualificationFilters.statuses.map(s => `isActive eq ${s}`).join(' or ')})`);
    }

    this.qualificationSchemesService.getAllQualificationSchemes(
      filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      this.qualificationFilters.search || undefined,
      this.qualificationOrderBy as any,
      this.pageSize,
      this.qualificationSkip,
    ).pipe(
      timeout(30000),
      catchError((err) => {
        this.qualificationError = err?.error?.message || 'Грешка при зареждане';
        this.qualificationLoading = false;
        this.cdr.markForCheck();
        return of({ content: [], totalElements: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe((response: any) => {
      this.qualificationSchemes = reset ? (response.content || []) : [...this.qualificationSchemes, ...(response.content || [])];
      this.qualificationTotalElements = response.totalElements || 0;
      this.qualificationHasMore = this.qualificationSchemes.length < this.qualificationTotalElements;
      this.qualificationLoading = false;
      this.qualificationLoaded = true;
      this.cdr.markForCheck();
    });
  }

  onQualificationFiltersChange(filters: QualificationFilters): void {
    this.qualificationFilters = { ...filters };
    this.loadQualificationSchemes();
  }

  onQualificationSortChange(orderBy: string[]): void {
    this.qualificationOrderBy = orderBy;
    this.loadQualificationSchemes();
  }

  openQualificationDetails(scheme: QualificationSchemeDto): void {
    this.router.navigate(['/regulations', 'qualification', scheme.uuid]);
  }

  onQualificationAdded(): void {
    this.isQualificationAddOpen = false;
    this.loadQualificationSchemes();
    this.cdr.markForCheck();
  }

  onQualificationSettingsChange(data: { columns: QualificationColumnConfig[]; filterConfigs: QualificationFilterConfig[] }): void {
    this.qualificationColumns = data.columns;
    this.qualificationFilterConfigs = data.filterConfigs;
    this.saveSettings();
    this.cdr.markForCheck();
  }

  // ===== SETTINGS (localStorage) =====

  private saveSettings(): void {
    localStorage.setItem('rules_group_columns', JSON.stringify(this.groupColumns));
    localStorage.setItem('rules_group_filterConfigs', JSON.stringify(this.groupFilterConfigs));
    localStorage.setItem('rules_discipline_columns', JSON.stringify(this.disciplineColumns));
    localStorage.setItem('rules_discipline_filterConfigs', JSON.stringify(this.disciplineFilterConfigs));
    localStorage.setItem('rules_scoring_columns', JSON.stringify(this.scoringColumns));
    localStorage.setItem('rules_scoring_filterConfigs', JSON.stringify(this.scoringFilterConfigs));
    localStorage.setItem('rules_qualification_columns', JSON.stringify(this.qualificationColumns));
    localStorage.setItem('rules_qualification_filterConfigs', JSON.stringify(this.qualificationFilterConfigs));
  }

  private loadSettings(): void {
    this.groupColumns = this.mergeColumns(this.groupColumns, 'rules_group_columns');
    this.groupFilterConfigs = this.mergeFilters(this.groupFilterConfigs, 'rules_group_filterConfigs');
    this.disciplineColumns = this.mergeColumns(this.disciplineColumns, 'rules_discipline_columns');
    this.disciplineFilterConfigs = this.mergeFilters(this.disciplineFilterConfigs, 'rules_discipline_filterConfigs');
    this.scoringColumns = this.mergeColumns(this.scoringColumns, 'rules_scoring_columns');
    this.scoringFilterConfigs = this.mergeFilters(this.scoringFilterConfigs, 'rules_scoring_filterConfigs');
    this.qualificationColumns = this.mergeColumns(this.qualificationColumns, 'rules_qualification_columns');
    this.qualificationFilterConfigs = this.mergeFilters(this.qualificationFilterConfigs, 'rules_qualification_filterConfigs');
  }

  private mergeColumns<T extends { id: string; visible: boolean }>(defaults: T[], key: string): T[] {
    const saved = localStorage.getItem(key);
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      return defaults.map((col) => {
        const s = parsed.find((p: any) => p.id === col.id);
        return s ? { ...col, visible: s.visible } : col;
      });
    } catch { return defaults; }
  }

  private mergeFilters<T extends { id: string; visible: boolean }>(defaults: T[], key: string): T[] {
    const saved = localStorage.getItem(key);
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      return defaults.map((f) => {
        const s = parsed.find((p: any) => p.id === f.id);
        return s ? { ...f, visible: s.visible } : f;
      });
    } catch { return defaults; }
  }
}
