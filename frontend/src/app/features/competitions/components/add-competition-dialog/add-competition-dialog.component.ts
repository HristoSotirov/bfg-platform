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
  CompetitionCreateRequest,
  CompetitionType,
  CompetitionDto,
  ScoringSchemesService,
  QualificationSchemesService,
  CompetitionTimetableEventsService,
  CompetitionTimetableEventRequest,
  CompetitionTimetableEventDto,
} from '../../../../core/services/api';
import { Subject, takeUntil, of, from, concatMap, catchError, toArray, Observable, map } from 'rxjs';
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
    awardingCeremonyAt: '',
    scoringSchemeId: '',
    qualificationSchemeId: '',
    competitionType: '' as string,
    isTemplate: false,
  };

  get isTemplate(): boolean {
    return this.formData.isTemplate;
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
        "isTemplate eq true", undefined, ['name_asc'] as any, top, skip
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

  readonly competitionTypeOptions: SearchableSelectOption[] = [
    { value: CompetitionType.NationalErgo, label: 'Национално (ерго)' },
    { value: CompetitionType.NationalWater, label: 'Национално (вода)' },
    { value: CompetitionType.Balkan, label: 'Балкански' },
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
    if (!this.formData.competitionType) return false;
    if (!this.isTemplate) {
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

  onTemplateToggle(isTemplate: boolean): void {
    this.formData.isTemplate = isTemplate;
    if (isTemplate) {
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
    this.formData.competitionType = (template.competitionType as string) || '';
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

    const request: CompetitionCreateRequest = {
      shortName: this.formData.shortName,
      name: this.formData.name,
      location: this.formData.location,
      startDate: this.formData.startDate,
      endDate: this.formData.endDate,
      entrySubmissionsOpenAt: this.isTemplate ? undefined : (this.formData.entrySubmissionsOpenAt || undefined),
      entrySubmissionsClosedAt: this.isTemplate ? undefined : (this.formData.entrySubmissionsClosedAt || undefined),
      lastChangesBeforeTmAt: this.isTemplate ? undefined : (this.formData.lastChangesBeforeTmAt || undefined),
      technicalMeetingAt: this.isTemplate ? undefined : (this.formData.technicalMeetingAt || undefined),
      awardingCeremonyAt: this.isTemplate ? undefined : (this.formData.awardingCeremonyAt || undefined),
      scoringSchemeId: this.formData.scoringSchemeId,
      qualificationSchemeId: this.formData.qualificationSchemeId,
      competitionType: (this.formData.competitionType as CompetitionType),
      isTemplate: this.formData.isTemplate,
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
          this.copyTimetableEventsFromTemplate(created.uuid, this.selectedTemplateId);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Грешка при създаване на състезание';
          this.cdr.markForCheck();
        },
      });
  }

  private copyTimetableEventsFromTemplate(newUuid: string, templateId: string): void {
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

          const template = this.cachedTemplates.find((t) => t.uuid === templateId);
          const templateStartStr = template?.startDate;
          if (!templateStartStr || !this.formData.startDate) {
            this.saving = false;
            this.added.emit();
            return;
          }

          const templateStart = new Date(templateStartStr + 'T00:00:00Z');
          const newStart = new Date(this.formData.startDate + 'T00:00:00Z');

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
                scheduledAt: newDayStr + 'T' + timePart,
                eventStatus: e.eventStatus!,
              } as CompetitionTimetableEventRequest;
            });

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

              if (eventsFailed > 0) {
                const errorDetail = timetableErrors.length > 0 ? ` (${timetableErrors[0]})` : '';
                this.copyPartialError = `Разписание: ${eventsOk}/${mappedEvents.length} ОК${errorDetail} — провалените могат да се добавят ръчно.`;
                this.cdr.markForCheck();
              } else {
                this.added.emit();
              }
            });
        },
        error: () => {
          this.saving = false;
          this.copyPartialError = 'Разписанието не успя да се копира — може да се добави ръчно.';
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
      awardingCeremonyAt: '',
      scoringSchemeId: '',
      qualificationSchemeId: '',
      competitionType: '',
      isTemplate: false,
    };
    this.error = null;
    this.saving = false;
    this.showTemplatePicker = false;
    this.selectedTemplateId = '';
    this.copyPartialError = null;
  }
}
