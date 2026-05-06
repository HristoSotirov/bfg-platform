import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, map, forkJoin, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DisciplineDetailsDialogComponent } from '../../../disciplines/components/discipline-details-dialog/discipline-details-dialog.component';
import { CompetitionGroupDetailsDialogComponent } from '../../../competition-groups/components/competition-group-details-dialog/competition-group-details-dialog.component';
import {
  CompetitionTimetableEventDto,
  DisciplineDefinitionDto,
  CompetitionGroupDefinitionDto,
  CompetitionGroupDefinitionsService,
  EntriesService,
  AccreditationsService,
  AccreditationDto,
  ClubEntriesRequest,
  EntryRequest,
  CrewMemberRequest,
  EntryDto,
  SeatPosition,
  DisciplineGender,
} from '../../../../core/services/api';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';
import { getBoatClassLabel } from '../../../../shared/utils/boat-class.util';

const SEAT_ORDER: SeatPosition[] = [
  SeatPosition.Bow, SeatPosition.Two, SeatPosition.Three, SeatPosition.Four,
  SeatPosition.Five, SeatPosition.Six, SeatPosition.Seven, SeatPosition.Stroke, SeatPosition.Cox,
];

const SEAT_LABEL_KEYS: Record<string, string> = {
  BOW: 'competitions.seatLabels.BOW', TWO: 'competitions.seatLabels.TWO',
  THREE: 'competitions.seatLabels.THREE', FOUR: 'competitions.seatLabels.FOUR',
  FIVE: 'competitions.seatLabels.FIVE', SIX: 'competitions.seatLabels.SIX',
  SEVEN: 'competitions.seatLabels.SEVEN', STROKE: 'competitions.seatLabels.STROKE',
  COX: 'competitions.seatLabels.COX',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'competitions.submitEntriesDialog.genderLabels.male',
  FEMALE: 'competitions.submitEntriesDialog.genderLabels.female',
  MIXED: 'competitions.submitEntriesDialog.genderLabels.mixed',
};

function getSeatPositions(crewSize: number, hasCoxswain: boolean): SeatPosition[] {
  const rowingSeats = crewSize;
  const seats: SeatPosition[] = [];
  if (rowingSeats >= 1) seats.push(SeatPosition.Stroke);
  if (rowingSeats >= 2) seats.push(SeatPosition.Bow);
  if (rowingSeats >= 3) seats.push(SeatPosition.Two);
  if (rowingSeats >= 4) seats.push(SeatPosition.Three);
  if (rowingSeats >= 5) seats.push(SeatPosition.Four);
  if (rowingSeats >= 6) seats.push(SeatPosition.Five);
  if (rowingSeats >= 7) seats.push(SeatPosition.Six);
  if (rowingSeats >= 8) seats.push(SeatPosition.Seven);
  if (hasCoxswain) seats.push(SeatPosition.Cox);
  return SEAT_ORDER.filter(s => seats.includes(s));
}

function buildGroupLabel(g: CompetitionGroupDefinitionDto, groupId: string): string {
  const ageRange = g.minAge != null ? `${g.minAge}-${g.maxAge ?? '∞'}` : '';
  return `${g.shortName || g.name || groupId} ${ageRange}`.trim();
}

export interface EligibleAthlete {
  accreditationId: string;
  athleteId: string;
  label: string;
  birthYear: number | null;
  age: number | null;
  cardNumber: string;
  isTransfer: boolean;
  gender: string | null;
}

export interface TeamRow {
  teamNumber: number;
  crew: { seat: SeatPosition; accreditationId: string }[];
}

export interface DisciplineEntry {
  disciplineId: string;
  discipline: DisciplineDefinitionDto;
  label: string;
  teams: TeamRow[];
}

export interface GroupEntry {
  groupId: string;
  group: CompetitionGroupDefinitionDto;
  groupLabel: string;
  /** Athletes matching this group's own age/gender */
  ownAthletes: EligibleAthlete[];
  /** Athletes from the transfer source group */
  transferAthletes: EligibleAthlete[];
  transferGroupLabel: string | null;
  selectedAthleteIds: Set<string>;  // stores accreditation IDs
  athleteSearch: string;
  showPool: boolean;
  availableDisciplines: { disciplineId: string; discipline: DisciplineDefinitionDto; label: string }[];
  disciplines: DisciplineEntry[];
}

@Component({
  selector: 'app-submit-entries-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent, DisciplineDetailsDialogComponent, CompetitionGroupDetailsDialogComponent],
  templateUrl: './submit-entries-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitEntriesDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() competitionId = '';
  @Input() competitionYear = new Date().getFullYear();
  @Input() clubId: string | null = null;
  @Input() timetableEvents: CompetitionTimetableEventDto[] = [];
  @Input() existingEntries: EntryDto[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  saving = false;
  errors: string[] = [];
  saveError: string | null = null;
  loadingAthletes = false;
  showTransferSchemaGroupId: string | null = null;
  athletePoolDialogGroup: GroupEntry | null = null;
  private poolDialogBeforeSchema: GroupEntry | null = null;

  groupEntries: GroupEntry[] = [];
  private allAccreditations: AccreditationDto[] = [];
  /** Transfer source groups loaded by UUID */
  private transferGroupCache = new Map<string, CompetitionGroupDefinitionDto>();

  readonly getSeatLabel = (seat: SeatPosition) => this.translate.instant(SEAT_LABEL_KEYS[seat] ?? seat);
  readonly getBoatClassLabel = getBoatClassLabel;

  constructor(
    private entriesService: EntriesService,
    private accreditationsService: AccreditationsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.destroy$.next();
      this.resetState();
      this.buildGroupEntries();
      this.loadData();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
      this.resetState();
    }
  }

  // ===== BUILD GROUP STRUCTURE =====

  private buildGroupEntries(): void {
    const groupMap = new Map<string, {
      group: CompetitionGroupDefinitionDto;
      disciplines: { disciplineId: string; discipline: DisciplineDefinitionDto; label: string }[];
    }>();
    const seenDisciplines = new Set<string>();

    for (const e of this.timetableEvents) {
      if (!e.disciplineId || seenDisciplines.has(e.disciplineId) || !e.discipline) continue;
      seenDisciplines.add(e.disciplineId);

      const disc = e.discipline;
      const groupId = disc.competitionGroupId || 'unknown';
      const group = disc.competitionGroup;

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          group: group ?? { uuid: groupId } as CompetitionGroupDefinitionDto,
          disciplines: [],
        });
      }
      groupMap.get(groupId)!.disciplines.push({
        disciplineId: e.disciplineId,
        discipline: disc,
        label: `${disc.shortName || disc.name || e.disciplineId} (${getBoatClassLabel(disc.boatClass)})`,
      });
    }

    this.groupEntries = Array.from(groupMap.entries()).map(([groupId, data]) => ({
      groupId,
      group: data.group,
      groupLabel: buildGroupLabel(data.group, groupId),
      ownAthletes: [],
      transferAthletes: [],
      transferGroupLabel: null,
      selectedAthleteIds: new Set<string>(),
      athleteSearch: '',
      showPool: true,
      availableDisciplines: data.disciplines,
      disciplines: [],
    })).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }

  // ===== LOAD DATA =====

  private loadData(): void {
    this.loadingAthletes = true;
    this.cdr.markForCheck();

    let yearFilter = `year eq ${this.competitionYear} and status eq 'ACTIVE'`;
    if (this.clubId) {
      yearFilter += ` and clubId eq '${this.clubId}'`;
    }
    const accreditations$ = fetchAllPages((skip, top) =>
      this.accreditationsService.getAllAccreditations(
        yearFilter, undefined, ['athlete.lastName_asc'] as any, top, skip, ['athlete'] as any
      ) as any
    ).pipe(map((items: any[]) => (items as AccreditationDto[]).filter(a => a.athlete)));

    // Collect transfer source group IDs that aren't already in groupEntries
    const transferGroupIds = new Set<string>();
    const knownGroupIds = new Set(this.groupEntries.map(ge => ge.groupId));
    for (const ge of this.groupEntries) {
      const tfId = ge.group.transferFromGroupId;
      if (tfId && !knownGroupIds.has(tfId) && !transferGroupIds.has(tfId)) {
        transferGroupIds.add(tfId);
      }
    }

    // Fetch missing transfer source groups
    const transferGroupFetches = Array.from(transferGroupIds).map(id =>
      this.competitionGroupDefinitionsService.getCompetitionGroupDefinitionByUuid(id)
    );
    const transferGroups$ = transferGroupFetches.length > 0
      ? forkJoin(transferGroupFetches)
      : of([] as CompetitionGroupDefinitionDto[]);

    forkJoin({ accreditations: accreditations$, transferGroups: transferGroups$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ accreditations, transferGroups }) => {
          this.allAccreditations = accreditations;

          // Cache transfer groups
          this.transferGroupCache.clear();
          for (const ge of this.groupEntries) {
            this.transferGroupCache.set(ge.groupId, ge.group);
          }
          for (const tg of transferGroups) {
            if (tg.uuid) this.transferGroupCache.set(tg.uuid, tg);
          }

          this.buildAllAthletePoolsAndInit();
          this.loadingAthletes = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingAthletes = false;
          this.cdr.markForCheck();
        },
      });
  }

  private buildAllAthletePoolsAndInit(): void {
    for (const ge of this.groupEntries) {
      const groupGender = this.deriveGroupGender(ge);
      ge.ownAthletes = this.buildEligibleAthletes(ge.group, groupGender, false);

      const tfId = ge.group.transferFromGroupId;
      if (tfId) {
        const sourceGroup = this.transferGroupCache.get(tfId);
        if (sourceGroup) {
          ge.transferAthletes = this.buildEligibleAthletes(sourceGroup, groupGender, true);
          ge.transferGroupLabel = buildGroupLabel(sourceGroup, tfId);
        }
      }
    }
    this.initFromExistingEntries();
  }

  /**
   * Derive a single gender for the group by looking at its disciplines.
   * If all disciplines share the same gender, use that; otherwise treat as MIXED.
   */
  private deriveGroupGender(ge: GroupEntry): DisciplineGender | undefined {
    const genders = new Set<DisciplineGender>();
    for (const ad of ge.availableDisciplines) {
      if (ad.discipline.gender) genders.add(ad.discipline.gender);
    }
    if (genders.size === 1) return genders.values().next().value;
    if (genders.size > 1) return DisciplineGender.Mixed;
    return undefined;
  }

  private buildEligibleAthletes(group: CompetitionGroupDefinitionDto, gender: DisciplineGender | undefined, isTransfer: boolean): EligibleAthlete[] {
    const minAge = group.minAge;
    const maxAge = group.maxAge;

    return this.allAccreditations
      .filter(acc => {
        const athlete = acc.athlete!;
        const birthYear = athlete.dateOfBirth ? new Date(athlete.dateOfBirth).getFullYear() : null;
        if (gender && gender !== DisciplineGender.Mixed) {
          if (athlete.gender !== gender) return false;
        }
        if (birthYear != null) {
          const age = this.competitionYear - birthYear;
          if (minAge != null && age < minAge) return false;
          if (maxAge != null && age > maxAge) return false;
        }
        return true;
      })
      .map(acc => {
        const athlete = acc.athlete!;
        const birthYear = athlete.dateOfBirth ? new Date(athlete.dateOfBirth).getFullYear() : null;
        const age = birthYear != null ? this.competitionYear - birthYear : null;
        const nameParts = [athlete.firstName, athlete.middleName, athlete.lastName].filter(Boolean);
        const nameStr = nameParts.join(' ') || athlete.uuid!;
        const cardNumber = acc.accreditationNumber || '';
        const labelParts = [nameStr];
        if (birthYear != null) labelParts.push(`(${birthYear}, ${age} ${this.translate.instant('competitions.submitEntriesDialog.yearAbbrev')})`);
        if (cardNumber) labelParts.push(`- ${cardNumber}`);

        return { accreditationId: acc.uuid!, athleteId: athlete.uuid!, label: labelParts.join(' '), birthYear, age, cardNumber, isTransfer, gender: athlete.gender ?? null };
      });
  }

  // ===== INIT FROM EXISTING =====

  private initFromExistingEntries(): void {
    if (!this.existingEntries.length) return;

    const discToGroup = new Map<string, GroupEntry>();
    for (const ge of this.groupEntries) {
      for (const ad of ge.availableDisciplines) {
        discToGroup.set(ad.disciplineId, ge);
      }
    }

    const byDiscipline = new Map<string, EntryDto[]>();
    for (const e of this.existingEntries) {
      if (!e.disciplineId) continue;
      if (!byDiscipline.has(e.disciplineId)) byDiscipline.set(e.disciplineId, []);
      byDiscipline.get(e.disciplineId)!.push(e);
    }

    for (const [disciplineId, entries] of byDiscipline) {
      const ge = discToGroup.get(disciplineId);
      if (!ge) continue;
      const avail = ge.availableDisciplines.find(d => d.disciplineId === disciplineId);
      if (!avail) continue;

      const disc = avail.discipline;
      const seats = getSeatPositions(disc.crewSize ?? 1, disc.hasCoxswain ?? false);
      const allPoolIds = new Set([
        ...ge.ownAthletes.map(a => a.accreditationId),
        ...ge.transferAthletes.map(a => a.accreditationId),
      ]);

      const teams: TeamRow[] = entries
        .sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
        .map(entry => {
          const members = Array.isArray(entry.crewMembers) ? entry.crewMembers : [];
          return {
            teamNumber: entry.teamNumber ?? 1,
            crew: seats.map(seat => {
              const cm = members.find(c => c.seatPosition === seat);
              const accreditationId = cm?.accreditationId ?? '';
              if (accreditationId) {
                ge.selectedAthleteIds.add(accreditationId);
                if (!allPoolIds.has(accreditationId) && cm?.accreditation) {
                  const acc = cm.accreditation;
                  const athlete = acc.athlete;
                  if (athlete) {
                    const birthYear = athlete.dateOfBirth ? new Date(athlete.dateOfBirth).getFullYear() : null;
                    const age = birthYear != null ? this.competitionYear - birthYear : null;
                    const nameParts = [athlete.firstName, athlete.middleName, athlete.lastName].filter(Boolean);
                    const nameStr = nameParts.join(' ') || athlete.uuid!;
                    const cardNumber = acc.accreditationNumber || '';
                    const labelParts = [nameStr];
                    if (birthYear != null) labelParts.push(`(${birthYear}, ${age} ${this.translate.instant('competitions.submitEntriesDialog.yearAbbrev')})`);
                    if (cardNumber) labelParts.push(`- ${cardNumber}`);
                    ge.ownAthletes.push({
                      accreditationId, athleteId: athlete.uuid!, label: labelParts.join(' '),
                      birthYear, age, cardNumber, isTransfer: false, gender: athlete.gender ?? null,
                    });
                    allPoolIds.add(accreditationId);
                  }
                }
              }
              return { seat, accreditationId };
            }),
          };
        });

      ge.disciplines.push({ disciplineId, discipline: disc, label: avail.label, teams });
    }
    this.cdr.markForCheck();
  }

  // ===== POOL =====

  getPoolOptions(ge: GroupEntry): SearchableSelectOption[] {
    const allEligible = [...ge.ownAthletes, ...ge.transferAthletes];
    return allEligible
      .filter(a => ge.selectedAthleteIds.has(a.accreditationId))
      .map(a => ({
        value: a.accreditationId,
        label: a.isTransfer ? `${this.translate.instant('competitions.submitEntriesDialog.transferBadge')} ${a.label}` : a.label,
      }));
  }

  getCoxOptions(ge: GroupEntry): SearchableSelectOption[] {
    const group = ge.group;
    const coxMinAge = group.coxMinAge ?? group.minAge;
    const coxMaxAge = group.coxMaxAge ?? group.maxAge;

    return this.allAccreditations
      .filter(acc => {
        const athlete = acc.athlete!;
        const birthYear = athlete.dateOfBirth ? new Date(athlete.dateOfBirth).getFullYear() : null;
        if (birthYear != null) {
          const age = this.competitionYear - birthYear;
          if (coxMinAge != null && age < coxMinAge) return false;
          if (coxMaxAge != null && age > coxMaxAge) return false;
        }
        return true;
      })
      .map(acc => {
        const athlete = acc.athlete!;
        const birthYear = athlete.dateOfBirth ? new Date(athlete.dateOfBirth).getFullYear() : null;
        const age = birthYear != null ? this.competitionYear - birthYear : null;
        const nameParts = [athlete.firstName, athlete.middleName, athlete.lastName].filter(Boolean);
        const nameStr = nameParts.join(' ') || athlete.uuid!;
        const cardNumber = acc.accreditationNumber || '';
        const labelParts = [nameStr];
        if (birthYear != null) labelParts.push(`(${birthYear}, ${age} ${this.translate.instant('competitions.submitEntriesDialog.yearAbbrev')})`);
        if (cardNumber) labelParts.push(`- ${cardNumber}`);
        return { value: acc.uuid!, label: labelParts.join(' ') };
      });
  }

  openAthletePoolDialog(ge: GroupEntry): void {
    this.athletePoolDialogGroup = ge;
    this.cdr.markForCheck();
  }

  openTransferSchemaFromPool(): void {
    this.poolDialogBeforeSchema = this.athletePoolDialogGroup;
    this.showTransferSchemaGroupId = this.athletePoolDialogGroup!.groupId;
    this.athletePoolDialogGroup = null;
    this.cdr.markForCheck();
  }

  closeTransferSchema(): void {
    this.showTransferSchemaGroupId = null;
    if (this.poolDialogBeforeSchema) {
      this.athletePoolDialogGroup = this.poolDialogBeforeSchema;
      this.poolDialogBeforeSchema = null;
    }
    this.cdr.markForCheck();
  }

  getSelectedAthletes(ge: GroupEntry): EligibleAthlete[] {
    const poolAthletes = [...ge.ownAthletes, ...ge.transferAthletes]
      .filter(a => ge.selectedAthleteIds.has(a.accreditationId));

    // Also include cox athletes not in the pool
    const poolIds = new Set(poolAthletes.map(a => a.accreditationId));
    const coxIds = new Set<string>();
    for (const de of ge.disciplines) {
      for (const team of de.teams) {
        for (const crew of team.crew) {
          if (crew.seat === SeatPosition.Cox && crew.accreditationId && !poolIds.has(crew.accreditationId)) {
            coxIds.add(crew.accreditationId);
          }
        }
      }
    }

    if (coxIds.size > 0) {
      const coxOptions = this.getCoxOptions(ge);
      for (const id of coxIds) {
        const opt = coxOptions.find(o => o.value === id);
        if (opt) {
          poolAthletes.push({
            accreditationId: id, athleteId: '', label: opt.label,
            birthYear: null, age: null, cardNumber: '', isTransfer: false, gender: null,
          });
        }
      }
    }

    return poolAthletes;
  }

  isAthleteInPool(ge: GroupEntry, accreditationId: string): boolean {
    return ge.selectedAthleteIds.has(accreditationId);
  }

  toggleAthleteInPool(ge: GroupEntry, accreditationId: string): void {
    if (ge.selectedAthleteIds.has(accreditationId)) {
      ge.selectedAthleteIds.delete(accreditationId);
      for (const de of ge.disciplines) {
        for (const team of de.teams) {
          for (const crew of team.crew) {
            if (crew.accreditationId === accreditationId) crew.accreditationId = '';
          }
        }
      }
    } else {
      ge.selectedAthleteIds.add(accreditationId);
    }
    this.cdr.markForCheck();
  }

  getFilteredOwn(ge: GroupEntry): EligibleAthlete[] {
    return this.filterAthletes(ge.ownAthletes, ge.athleteSearch);
  }

  getFilteredTransfer(ge: GroupEntry): EligibleAthlete[] {
    return this.filterAthletes(ge.transferAthletes, ge.athleteSearch);
  }

  private filterAthletes(athletes: EligibleAthlete[], search: string): EligibleAthlete[] {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase().trim();
    return athletes.filter(a => a.label.toLowerCase().includes(q));
  }

  isTransferAthlete(ge: GroupEntry, accreditationId: string): boolean {
    return ge.transferAthletes.some(a => a.accreditationId === accreditationId);
  }

  /** Count transfer athletes currently selected in the group pool */
  getSelectedTransferCount(ge: GroupEntry): number {
    return ge.transferAthletes.filter(a => ge.selectedAthleteIds.has(a.accreditationId)).length;
  }

  /** Count transfer athletes actually assigned to seats across this group's disciplines */
  getAssignedTransferCount(ge: GroupEntry): number {
    const assigned = new Set<string>();
    for (const de of ge.disciplines) {
      for (const team of de.teams) {
        for (const crew of team.crew) {
          if (crew.accreditationId && this.isTransferAthlete(ge, crew.accreditationId)) {
            assigned.add(crew.accreditationId);
          }
        }
      }
    }
    return assigned.size;
  }

  /** Check if a transfer athlete exceeds transferredMaxDisciplinesPerAthlete */
  isTransferAthleteOverDisciplineLimit(ge: GroupEntry, athleteId: string): boolean {
    const max = ge.group.transferredMaxDisciplinesPerAthlete;
    if (max == null || !athleteId) return false;
    let count = 0;
    for (const de of ge.disciplines) {
      if (de.teams.some(t => t.crew.some(c => c.accreditationId === athleteId))) count++;
    }
    return count > max;
  }

  /**
   * Transfer schema table (Таблица №1/2 from Чл.5):
   * Given a transfer ratio (e.g. 35%), returns max allowed transfers for a given total athlete count.
   * Uses FLOOR rounding by default.
   */
  getTransferSchemaTable(ge: GroupEntry): { total: number; maxTransfer: number }[] {
    const ratio = ge.group.transferRatio;
    if (ratio == null || ratio <= 0) return [];
    const max = Math.max(12, ge.selectedAthleteIds.size + 2);
    const table: { total: number; maxTransfer: number }[] = [];
    for (let total = 2; total <= max; total++) {
      table.push({ total, maxTransfer: Math.floor(total * ratio / 100) });
    }
    return table;
  }

  /** Count unique athletes assigned to seats across all disciplines in this group */
  getGroupAssignedAthleteCount(ge: GroupEntry): number {
    const assigned = new Set<string>();
    for (const de of ge.disciplines) {
      for (const team of de.teams) {
        for (const crew of team.crew) {
          if (crew.accreditationId) assigned.add(crew.accreditationId);
        }
      }
    }
    return assigned.size;
  }

  /** Count unique TRANSFER athletes assigned to non-COX seats across all disciplines in this group */
  getGroupAssignedTransferAthleteCount(ge: GroupEntry): number {
    const assigned = new Set<string>();
    for (const de of ge.disciplines) {
      for (const team of de.teams) {
        for (const crew of team.crew) {
          if (crew.accreditationId && crew.seat !== SeatPosition.Cox && this.isTransferAthlete(ge, crew.accreditationId)) {
            assigned.add(crew.accreditationId);
          }
        }
      }
    }
    return assigned.size;
  }

  /** Max allowed transfer athletes for the current selected pool size in this group */
  getMaxAllowedTransferForGroup(ge: GroupEntry): number | null {
    const ratio = ge.group.transferRatio;
    if (ratio == null || ratio <= 0) return null;
    const totalSelected = ge.selectedAthleteIds.size;
    if (totalSelected < 2) return 0;
    return Math.floor(totalSelected * ratio / 100);
  }

  /** Check if current transfer selection exceeds the schema */
  isGroupOverTransferSchema(ge: GroupEntry): boolean {
    const max = this.getMaxAllowedTransferForGroup(ge);
    if (max == null) return false;
    return this.getSelectedTransferCount(ge) > max;
  }

  /** Count teams this athlete is assigned to across ALL groups */
  getAthleteTeamCount(athleteId: string): number {
    let count = 0;
    for (const ge of this.groupEntries) {
      for (const de of ge.disciplines) {
        for (const team of de.teams) {
          if (team.crew.some(c => c.accreditationId === athleteId)) count++;
        }
      }
    }
    return count;
  }

  getAthleteGroupCounts(ge: GroupEntry, athleteId: string): { disc: number; cox: number } {
    let disc = 0;
    let cox = 0;
    for (const de of ge.disciplines) {
      for (const team of de.teams) {
        for (const c of team.crew) {
          if (c.accreditationId === athleteId) {
            if (c.seat === 'COX') cox++;
            else disc++;
          }
        }
      }
    }
    return { disc, cox };
  }

  /** Count disciplines this athlete is assigned to */
  getAthleteDisciplineCount(athleteId: string): number {
    let count = 0;
    for (const ge of this.groupEntries) {
      for (const de of ge.disciplines) {
        if (de.teams.some(t => t.crew.some(c => c.accreditationId === athleteId))) count++;
      }
    }
    return count;
  }

  isAthleteOverLimit(ge: GroupEntry, athleteId: string): boolean {
    const max = ge.group.maxDisciplinesPerAthlete;
    if (max == null || !athleteId) return false;
    return this.getAthleteDisciplineCount(athleteId) > max;
  }

  /** Count transfer athletes (non-COX seats) in a team */
  getTeamTransferCount(ge: GroupEntry, team: TeamRow): number {
    return team.crew.filter(c =>
      c.accreditationId && c.seat !== SeatPosition.Cox && this.isTransferAthlete(ge, c.accreditationId)
    ).length;
  }

  /** Count assigned (non-empty) seats in a team */
  getTeamFilledCount(team: TeamRow): number {
    return team.crew.filter(c => c.accreditationId).length;
  }

  /** Count own (non-transfer) athletes in non-COX seats */
  getTeamOwnCount(ge: GroupEntry, team: TeamRow): number {
    return team.crew.filter(c =>
      c.accreditationId && c.seat !== SeatPosition.Cox && !this.isTransferAthlete(ge, c.accreditationId)
    ).length;
  }

  /** Check if team has any duplicate athletes */
  hasTeamDuplicateAthletes(team: TeamRow): boolean {
    const ids = team.crew.filter(c => c.accreditationId).map(c => c.accreditationId);
    return new Set(ids).size !== ids.length;
  }

  isTeamOverTransferLimit(de: DisciplineEntry, ge: GroupEntry, team: TeamRow): boolean {
    const max = de.discipline.maxCrewFromTransfer;
    if (max == null) return false;
    return this.getTeamTransferCount(ge, team) > max;
  }

  hasTeamGenderImbalance(de: DisciplineEntry, ge: GroupEntry, team: TeamRow): boolean {
    if (de.discipline.gender !== DisciplineGender.Mixed) return false;
    const crewSize = de.discipline.crewSize ?? 0;
    const rowers = team.crew.filter(c => c.seat !== SeatPosition.Cox && c.accreditationId);
    if (rowers.length < crewSize) return false;

    const allAthletes = [...ge.ownAthletes, ...ge.transferAthletes];
    const athleteMap = new Map(allAthletes.map(a => [a.accreditationId, a]));
    let maleCount = 0;
    let femaleCount = 0;
    for (const r of rowers) {
      const athlete = athleteMap.get(r.accreditationId);
      if (athlete?.gender === 'MALE') maleCount++;
      else if (athlete?.gender === 'FEMALE') femaleCount++;
    }
    return maleCount !== femaleCount;
  }

  /** Check if team has any problem */
  hasTeamError(de: DisciplineEntry, ge: GroupEntry, team: TeamRow): boolean {
    return this.isTeamOverTransferLimit(de, ge, team) || this.hasTeamDuplicateAthletes(team) || this.hasTeamGenderImbalance(de, ge, team);
  }

  // ===== DISCIPLINE TOGGLE =====

  isDisciplineAdded(ge: GroupEntry, disciplineId: string): boolean {
    return ge.disciplines.some(d => d.disciplineId === disciplineId);
  }

  toggleDiscipline(ge: GroupEntry, avail: { disciplineId: string; discipline: DisciplineDefinitionDto; label: string }): void {
    if (this.isDisciplineAdded(ge, avail.disciplineId)) {
      ge.disciplines = ge.disciplines.filter(d => d.disciplineId !== avail.disciplineId);
    } else {
      const disc = avail.discipline;
      const seats = getSeatPositions(disc.crewSize ?? 1, disc.hasCoxswain ?? false);
      ge.disciplines.push({
        disciplineId: avail.disciplineId,
        discipline: disc,
        label: avail.label,
        teams: [{ teamNumber: 1, crew: seats.map(seat => ({ seat, accreditationId: '' })) }],
      });
    }
    this.cdr.markForCheck();
  }

  removeDiscipline(ge: GroupEntry, disciplineId: string): void {
    ge.disciplines = ge.disciplines.filter(d => d.disciplineId !== disciplineId);
    this.cdr.markForCheck();
  }

  // ===== TEAMS =====

  addTeam(de: DisciplineEntry): void {
    const maxBoats = de.discipline.maxBoatsPerClub ?? 1;
    if (de.teams.length >= maxBoats) return;
    const seats = getSeatPositions(de.discipline.crewSize ?? 1, de.discipline.hasCoxswain ?? false);
    de.teams.push({ teamNumber: de.teams.length + 1, crew: seats.map(seat => ({ seat, accreditationId: '' })) });
    this.cdr.markForCheck();
  }

  removeTeam(de: DisciplineEntry, teamIdx: number): void {
    de.teams.splice(teamIdx, 1);
    de.teams.forEach((t, i) => t.teamNumber = i + 1);
    this.cdr.markForCheck();
  }

  canAddTeam(de: DisciplineEntry): boolean {
    return de.teams.length < (de.discipline.maxBoatsPerClub ?? 1);
  }

  onAthleteChange(crewItem: { seat: SeatPosition; accreditationId: string }, value: string | null): void {
    crewItem.accreditationId = value ?? '';
    this.cdr.markForCheck();
  }

  get hasAnyDiscipline(): boolean {
    return this.groupEntries.some(ge => ge.disciplines.length > 0);
  }

  // ===== SUBMIT =====

  submit(): void {
    this.saving = true;
    this.errors = [];
    this.saveError = null;
    this.cdr.markForCheck();

    const entries: EntryRequest[] = [];
    for (const ge of this.groupEntries) {
      for (const de of ge.disciplines) {
        for (const team of de.teams) {
          const crewMembers: CrewMemberRequest[] = team.crew
            .filter(c => c.accreditationId)
            .map(c => ({ seatPosition: c.seat, accreditationId: c.accreditationId }));
          entries.push({ disciplineId: de.disciplineId, teamNumber: team.teamNumber, crewMembers });
        }
      }
    }

    this.entriesService
      .submitCompetitionEntries(this.competitionId, this.clubId!, { entries })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.submitted.emit();
          this.closed.emit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          if (err?.status === 422 && err?.error?.errors) {
            this.errors = err.error.errors as string[];
          } else {
            this.saveError = err?.error?.message || this.translate.instant('competitions.submitEntriesDialog.errors.saveFailed');
          }
          this.cdr.markForCheck();
        },
      });
  }

  // ===== DETAIL DIALOGS =====

  selectedDiscipline: DisciplineDefinitionDto | null = null;
  selectedGroup: CompetitionGroupDefinitionDto | null = null;
  disciplinePermalinkRoute: string[] | null = null;
  groupPermalinkRoute: string[] | null = null;

  /** Build groupMap for discipline dialog (group UUID → display name) */
  get groupMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const ge of this.groupEntries) {
      map[ge.groupId] = ge.groupLabel;
    }
    return map;
  }

  openDisciplineDetails(dto: DisciplineDefinitionDto): void {
    this.selectedDiscipline = dto;
    this.disciplinePermalinkRoute = null;
    this.cdr.markForCheck();
  }

  closeDisciplineDetails(): void {
    this.selectedDiscipline = null;
    this.disciplinePermalinkRoute = null;
    this.cdr.markForCheck();
  }

  openGroupDetails(group: CompetitionGroupDefinitionDto): void {
    this.selectedGroup = group;
    this.groupPermalinkRoute = null;
    this.cdr.markForCheck();
  }

  closeGroupDetails(): void {
    this.selectedGroup = null;
    this.groupPermalinkRoute = null;
    this.cdr.markForCheck();
  }

  close(): void {
    this.closed.emit();
  }

  private resetState(): void {
    this.saving = false;
    this.errors = [];
    this.saveError = null;
    this.groupEntries = [];
    this.allAccreditations = [];
    this.transferGroupCache.clear();
  }
}
