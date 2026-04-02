import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  OnInit,
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
import {
  CompetitionsService,
  CompetitionRequest,
  CompetitionStatus,
  CompetitionDto,
  ScoringSchemesService,
  ScoringSchemeDto,
  QualificationSchemesService,
  QualificationSchemeDto,
  CompetitionDisciplineSchemesService,
  CompetitionTimetableEventsService,
  CompetitionDisciplineSchemeRequest,
  CompetitionTimetableEventRequest,
  CompetitionDisciplineSchemeDto,
  CompetitionTimetableEventDto,
} from '../../../../core/services/api';
import { Subject, takeUntil, of, from, concatMap, catchError, toArray } from 'rxjs';

@Component({
  selector: 'app-add-competition-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
  ],
  templateUrl: './add-competition-dialog.component.html',
  styleUrl: './add-competition-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCompetitionDialogComponent implements OnChanges, OnInit {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  isTemplate = true;

  formData = {
    shortName: '',
    name: '',
    durationDays: undefined as number | undefined,
    season: new Date().getFullYear(),
    location: '',
    startDate: '',
    endDate: '',
    status: CompetitionStatus.Draft as string,
    scopeType: 'INTERNAL' as string,
    scoringSchemeId: '',
    qualificationSchemeId: '',
  };

  scoringSchemes: ScoringSchemeDto[] = [];
  qualificationSchemes: QualificationSchemeDto[] = [];

  scoringSchemeOptions: SearchableSelectOption[] = [];
  qualificationSchemeOptions: SearchableSelectOption[] = [];

  readonly isTemplateOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Шаблон' },
    { value: 'false', label: 'Реално' },
  ];

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

  saving = false;
  error: string | null = null;

  showTemplatePicker = false;
  selectedTemplateId = '';
  templateOptions: SearchableSelectOption[] = [];
  templates: CompetitionDto[] = [];
  copyPartialError: string | null = null;

  constructor(
    private competitionsService: CompetitionsService,
    private scoringSchemesService: ScoringSchemesService,
    private qualificationSchemesService: QualificationSchemesService,
    private disciplineSchemesService: CompetitionDisciplineSchemesService,
    private timetableEventsService: CompetitionTimetableEventsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSchemes();
    this.loadTemplates();
  }

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
    if (!this.isTemplate) {
      if (!this.formData.season || !this.formData.location) return false;
      if (!this.formData.startDate || !this.formData.endDate) return false;
      if (!this.formData.status) return false;
    }
    return true;
  }

  get selectedTemplateName(): string {
    return this.templateOptions.find((o) => o.value === this.selectedTemplateId)?.label ?? '';
  }

  onIsTemplateChange(value: string): void {
    this.isTemplate = value === 'true';
    if (this.isTemplate) {
      this.selectedTemplateId = '';
      this.showTemplatePicker = false;
      this.copyPartialError = null;
    }
  }

  onUseTemplate(templateId: string): void {
    const template = this.templates.find((t) => t.uuid === templateId);
    if (!template) return;
    this.selectedTemplateId = templateId;
    this.showTemplatePicker = false;
    this.formData.shortName = template.shortName || '';
    this.formData.name = template.name || '';
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
      isTemplate: this.isTemplate,
      shortName: this.formData.shortName,
      name: this.formData.name,
      durationDays: (this.isTemplate
        ? this.formData.durationDays
        : this.computeDurationDays()) as number,
      season: this.isTemplate ? undefined : this.formData.season,
      location: this.isTemplate ? undefined : this.formData.location,
      startDate: this.isTemplate ? undefined : this.formData.startDate,
      endDate: this.isTemplate ? undefined : this.formData.endDate,
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
    this.disciplineSchemesService
      .getAllCompetitionDisciplineSchemes(`competitionId eq '${templateId}'`, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const disciplines: CompetitionDisciplineSchemeDto[] = resp.content || [];
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
    this.timetableEventsService
      .getAllCompetitionTimetableEvents(`competitionId eq '${templateId}'`, undefined, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const events: CompetitionTimetableEventDto[] = resp.content || [];
          from(events)
            .pipe(
              concatMap((e) =>
                this.timetableEventsService
                  .createCompetitionTimetableEvent({
                    competitionId: newUuid,
                    eventNumber: e.eventNumber!,
                    disciplineId: e.disciplineId!,
                    qualificationEventType: e.qualificationEventType!,
                    qualificationStageNumber: e.qualificationStageNumber!,
                    dayOffset: e.dayOffset!,
                    plannedTime: e.plannedTime!,
                    scheduledAt: this.computeScheduledAt(this.formData.startDate, e.dayOffset!),
                    eventStatus: e.eventStatus!,
                  } as CompetitionTimetableEventRequest)
                  .pipe(catchError(() => of(null)))
              ),
              toArray(),
              takeUntil(this.destroy$),
            )
            .subscribe((eventResults) => {
              const eventsOk = eventResults.filter((r) => r !== null).length;
              const eventsFailed = events.length - eventsOk;

              this.saving = false;

              if (disciplineFailed > 0 || eventsFailed > 0) {
                const parts: string[] = [];
                if (disciplineTotal > 0) {
                  parts.push(`Дисциплини: ${disciplineOk}/${disciplineTotal} ОК`);
                }
                if (events.length > 0) {
                  parts.push(`Разписание: ${eventsOk}/${events.length} ОК`);
                }
                this.copyPartialError = `${parts.join(', ')} — провалените могат да се добавят ръчно.`;
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

  private computeScheduledAt(startDate: string, dayOffset: number): string {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private computeDurationDays(): number {
    if (!this.formData.startDate || !this.formData.endDate) return 1;
    const start = new Date(this.formData.startDate);
    const end = new Date(this.formData.endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }

  private resetForm(): void {
    this.isTemplate = true;
    this.formData = {
      shortName: '',
      name: '',
      durationDays: undefined as number | undefined,
      season: new Date().getFullYear(),
      location: '',
      startDate: '',
      endDate: '',
      status: CompetitionStatus.Draft,
      scopeType: 'INTERNAL',
      scoringSchemeId: '',
      qualificationSchemeId: '',
    };
    this.error = null;
    this.saving = false;
    this.showTemplatePicker = false;
    this.selectedTemplateId = '';
    this.copyPartialError = null;
  }

  private loadSchemes(): void {
    this.scoringSchemesService
      .getAllScoringSchemes('isActive eq true', undefined, ['name_asc'] as any, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          this.scoringSchemes = resp.content || [];
          this.scoringSchemeOptions = this.scoringSchemes.map((s) => ({
            value: s.uuid || '',
            label: s.name || '',
          }));
          this.cdr.markForCheck();
        },
      });

    this.qualificationSchemesService
      .getAllQualificationSchemes('isActive eq true', undefined, ['name_asc'] as any, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          this.qualificationSchemes = resp.content || [];
          this.qualificationSchemeOptions = this.qualificationSchemes.map((s) => ({
            value: s.uuid || '',
            label: s.name || '',
          }));
          this.cdr.markForCheck();
        },
      });
  }

  private loadTemplates(): void {
    this.competitionsService
      .getAllCompetitions('isTemplate eq true', undefined, ['name_asc'] as any, 200, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          this.templates = resp.content || [];
          this.templateOptions = this.templates.map((t) => ({
            value: t.uuid || '',
            label: t.name || t.shortName || '',
          }));
          this.cdr.markForCheck();
        },
      });
  }
}
