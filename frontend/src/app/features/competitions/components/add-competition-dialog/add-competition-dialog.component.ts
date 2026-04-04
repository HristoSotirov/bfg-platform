import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DateTimePickerComponent } from '../../../../shared/components/datetime-picker/datetime-picker.component';
import {
  CompetitionsService,
  CompetitionRequest,
  CompetitionStatus,
  CompetitionDto,
  ScoringSchemesService,
  QualificationSchemesService,
  CompetitionDisciplineSchemesService,
  CompetitionTimetableEventsService,
  CompetitionDisciplineSchemeRequest,
  CompetitionTimetableEventRequest,
  CompetitionDisciplineSchemeDto,
  CompetitionTimetableEventDto,
} from '../../../../core/services/api';
import { Subject, takeUntil, of, from, concatMap, catchError, toArray, Observable, map, tap } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-competition-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    DatePickerComponent,
    DateTimePickerComponent,
  ],
  templateUrl: './add-competition-dialog.component.html',
  styleUrl: './add-competition-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCompetitionDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    shortName: '',
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    entrySubmissionsOpenAt: '',
    entrySubmissionsClosedAt: '',
    lastChangesBeforeTmAt: '',
    technicalMeetingAt: '',
    status: '' as string,
    scopeType: '' as string,
    scoringSchemeId: '',
    qualificationSchemeId: '',
  };

  get isDraft(): boolean {
    return this.formData.status === CompetitionStatus.Draft;
  }

  private cachedTemplates: CompetitionDto[] = [];

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

  templateSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.competitionsService.getAllCompetitions(
        "status eq 'DRAFT'", undefined, ['name_asc'] as any, top, skip
      ) as any
    ).pipe(map((items: any[]) => {
      this.cachedTemplates = items;
      return items.map((t: any) => {
        const duration = this.computeDuration(t.startDate, t.endDate);
        const durationStr = duration ? ` · ${duration} ${duration === 1 ? 'ден' : 'дни'}` : '';
        return {
          value: t.uuid || '',
          label: `${t.shortName || t.name || ''}${durationStr}`,
        };
      });
    }));

  readonly statusOptions: SearchableSelectOption[] = [
    { value: CompetitionStatus.Draft, label: 'Шаблон (Чернова)' },
    { value: CompetitionStatus.Planned, label: 'Реално (Планирано)' },
  ];

  readonly scopeTypeOptions: SearchableSelectOption[] = [
    { value: 'INTERNAL', label: 'Вътрешен' },
    { value: 'EXTERNAL', label: 'Международен' },
    { value: 'NATIONAL', label: 'Национален' },
  ];

  saving = false;
  error: string | null = null;

  showTemplatePicker = false;
  selectedTemplateId = '';
  copyPartialError: string | null = null;

  constructor(
    private competitionsService: CompetitionsService,
    private scoringSchemesService: ScoringSchemesService,
    private qualificationSchemesService: QualificationSchemesService,
    private disciplineSchemesService: CompetitionDisciplineSchemesService,
    private timetableEventsService: CompetitionTimetableEventsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    this.closed.emit();
  }

  get isFormValid(): boolean {
    if (!this.formData.shortName || !this.formData.name) return false;
    if (!this.formData.scoringSchemeId || !this.formData.qualificationSchemeId) return false;
    if (!this.formData.startDate || !this.formData.endDate) return false;
    if (!this.formData.location) return false;
    if (!this.formData.scopeType) return false;
    if (!this.formData.status) return false;
    if (!this.isDraft) {
      if (!this.formData.entrySubmissionsOpenAt || !this.formData.entrySubmissionsClosedAt) return false;
      if (!this.formData.lastChangesBeforeTmAt || !this.formData.technicalMeetingAt) return false;
    }
    return true;
  }

  get selectedTemplateName(): string {
    const t = this.cachedTemplates.find((t) => t.uuid === this.selectedTemplateId);
    return t?.shortName || t?.name || '';
  }

  get selectedTemplateDuration(): number | null {
    const t = this.cachedTemplates.find((t) => t.uuid === this.selectedTemplateId);
    return this.computeDuration(t?.startDate, t?.endDate);
  }

  private computeDuration(startDate?: string | null, endDate?: string | null): number | null {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return days > 0 ? days : null;
  }

  onStatusChange(value: string): void {
    this.formData.status = value;
    if (this.isDraft) {
      this.selectedTemplateId = '';
      this.showTemplatePicker = false;
      this.copyPartialError = null;
    }
    this.cdr.markForCheck();
  }

  onUseTemplate(templateId: string): void {
    const template = this.cachedTemplates.find((t) => t.uuid === templateId);
    if (!template) return;
    this.selectedTemplateId = templateId;
    this.showTemplatePicker = false;
    this.formData.shortName = template.shortName || '';
    this.formData.name = template.name || '';
    this.formData.location = template.location || '';
    this.formData.scoringSchemeId = template.scoringSchemeId || '';
    this.formData.qualificationSchemeId = template.qualificationSchemeId || '';
    this.formData.scopeType = template.scopeType || 'INTERNAL';
    this.cdr.markForCheck();
  }

  clearTemplate(): void {
    this.selectedTemplateId = '';
    this.copyPartialError = null;
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.copyPartialError = null;
    this.cdr.markForCheck();

    const request: CompetitionRequest = {
      shortName: this.formData.shortName,
      name: this.formData.name,
      location: this.formData.location,
      startDate: this.formData.startDate,
      endDate: this.formData.endDate,
      entrySubmissionsOpenAt: this.isDraft ? undefined : (this.formData.entrySubmissionsOpenAt || undefined),
      entrySubmissionsClosedAt: this.isDraft ? undefined : (this.formData.entrySubmissionsClosedAt || undefined),
      lastChangesBeforeTmAt: this.isDraft ? undefined : (this.formData.lastChangesBeforeTmAt || undefined),
      technicalMeetingAt: this.isDraft ? undefined : (this.formData.technicalMeetingAt || undefined),
      status: (this.formData.status as CompetitionStatus),
      scopeType: this.formData.scopeType as any,
      scoringSchemeId: this.formData.scoringSchemeId,
      qualificationSchemeId: this.formData.qualificationSchemeId,
    };

    this.competitionsService
      .createCompetition(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created: any) => {
          if (!this.selectedTemplateId) {
            this.saving = false;
            this.added.emit();
            return;
          }
          this.copyFromTemplate(created.uuid, this.selectedTemplateId);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Грешка при създаване на състезание';
          this.cdr.markForCheck();
        },
      });
  }

  private copyFromTemplate(newUuid: string, templateId: string): void {
    // Load disciplines
    fetchAllPages((skip, top) =>
      this.disciplineSchemesService.getAllCompetitionDisciplineSchemes(
        `competitionId eq '${templateId}'`, top, skip
      ) as any
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (disciplines: any[]) => {
          // Copy disciplines sequentially, catch each individually
          from(disciplines)
            .pipe(
              concatMap((d) =>
                this.disciplineSchemesService
                  .createCompetitionDisciplineScheme({
                    competitionId: newUuid,
                    disciplineId: d.disciplineId!,
                  } as CompetitionDisciplineSchemeRequest)
                  .pipe(catchError(() => of(null)))
              ),
              toArray(),
              takeUntil(this.destroy$),
            )
            .subscribe((disciplineResults) => {
              const disciplineOk = disciplineResults.filter((r) => r !== null).length;
              const disciplineFailed = disciplines.length - disciplineOk;
              this.copyTimetableEvents(newUuid, templateId, disciplines.length, disciplineOk, disciplineFailed);
            });
        },
        error: () => {
          this.copyTimetableEvents(newUuid, templateId, 0, 0, 0);
        },
      });
  }

  private copyTimetableEvents(
    newUuid: string,
    templateId: string,
    disciplineTotal: number,
    disciplineOk: number,
    disciplineFailed: number,
  ): void {
    fetchAllPages((skip, top) =>
      this.timetableEventsService.getAllCompetitionTimetableEvents(
        `competitionId eq '${templateId}'`, undefined, top, skip
      ) as any
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events: any[]) => {
          if (events.length === 0) {
            this.saving = false;
            this.added.emit();
            return;
          }

          // Use the template's startDate as the day-offset anchor
          const template = this.cachedTemplates.find((t) => t.uuid === templateId);
          const templateStartStr = template?.startDate;
          if (!templateStartStr || !this.formData.startDate) {
            this.saving = false;
            this.added.emit();
            return;
          }

          const templateStart = new Date(templateStartStr + 'T00:00:00Z');
          const newStart = new Date(this.formData.startDate + 'T00:00:00Z');

          // Map each template event by day offset from template startDate
          const mappedEvents = events
            .filter((e) => e.scheduledAt)
            .map((e) => {
              const eventDateStr = e.scheduledAt.split('T')[0];
              const eventDate = new Date(eventDateStr + 'T00:00:00Z');
              const dayOffset = Math.round((eventDate.getTime() - templateStart.getTime()) / 86400000);
              const newDate = new Date(newStart.getTime() + dayOffset * 86400000);
              const newDayStr = newDate.toISOString().split('T')[0];
              const timePart = e.scheduledAt.includes('T') ? e.scheduledAt.split('T')[1] : '00:00:00Z';
              return {
                competitionId: newUuid,
                disciplineId: e.disciplineId!,
                qualificationEventType: e.qualificationEventType!,
                qualificationStageNumber: e.qualificationStageNumber!,
                scheduledAt: newDayStr + 'T' + timePart,
                eventStatus: e.eventStatus!,
              } as CompetitionTimetableEventRequest;
            })
            .filter((e): e is CompetitionTimetableEventRequest => e !== null);

          const timetableErrors: string[] = [];
          from(mappedEvents)
            .pipe(
              concatMap((e) =>
                this.timetableEventsService
                  .createCompetitionTimetableEvent(e)
                  .pipe(catchError((err) => {
                    timetableErrors.push(err?.error?.message || err?.message || 'unknown');
                    return of(null);
                  }))
              ),
              toArray(),
              takeUntil(this.destroy$),
            )
            .subscribe((eventResults) => {
              const eventsOk = eventResults.filter((r) => r !== null).length;
              const eventsFailed = mappedEvents.length - eventsOk;

              this.saving = false;

              if (disciplineFailed > 0 || eventsFailed > 0) {
                const parts: string[] = [];
                if (disciplineTotal > 0) {
                  parts.push(`Дисциплини: ${disciplineOk}/${disciplineTotal} ОК`);
                }
                if (events.length > 0) {
                  parts.push(`Разписание: ${eventsOk}/${mappedEvents.length} ОК`);
                }
                const errorDetail = timetableErrors.length > 0 ? ` (${timetableErrors[0]})` : '';
                this.copyPartialError = `${parts.join(', ')}${errorDetail} — провалените могат да се добавят ръчно.`;
                this.cdr.markForCheck();
              } else {
                this.added.emit();
              }
            });
        },
        error: () => {
          this.saving = false;
          if (disciplineFailed > 0) {
            this.copyPartialError = `Дисциплини: ${disciplineOk}/${disciplineTotal} ОК, Разписание: неуспешно — провалените могат да се добавят ръчно.`;
          } else {
            this.copyPartialError = 'Разписанието не успя да се копира — може да се добави ръчно.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  private resetForm(): void {
    this.formData = {
      shortName: '',
      name: '',
      location: '',
      startDate: '',
      endDate: '',
      entrySubmissionsOpenAt: '',
      entrySubmissionsClosedAt: '',
      lastChangesBeforeTmAt: '',
      technicalMeetingAt: '',
      status: '',
      scopeType: '',
      scoringSchemeId: '',
      qualificationSchemeId: '',
    };
    this.error = null;
    this.saving = false;
    this.showTemplatePicker = false;
    this.selectedTemplateId = '';
    this.copyPartialError = null;
  }
}
