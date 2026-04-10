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
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import {
  DisciplineDefinitionsService,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { Observable, takeUntil, Subject, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-discipline-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './add-discipline-dialog.component.html',
  styleUrl: './add-discipline-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDisciplineDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() defaultGroupId: string = '';
  @Input() defaultGroupName: string = '';

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    name: '',
    shortName: '',
    competitionGroupId: '',
    boatClass: '' as string,
    maxCrewFromTransfer: null as number | null,
    isLightweight: '' as string,
    distanceMeters: null as number | null,
    isActive: true,
  };

  readonly boatClassOptions: SearchableSelectOption[] = [
    { value: 'SINGLE_SCULL', label: '1X' },
    { value: 'DOUBLE_SCULL', label: '2X' },
    { value: 'COXED_PAIR', label: '2+' },
    { value: 'PAIR', label: '2-' },
    { value: 'QUAD', label: '4X' },
    { value: 'COXED_QUAD', label: '4X+' },
    { value: 'COXED_FOUR', label: '4+' },
    { value: 'FOUR', label: '4-' },
    { value: 'EIGHT', label: '8+' },
    { value: 'ERGO', label: 'ERGO' },
  ];

  readonly booleanOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Не' },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
  ];

  saving = false;
  error: string | null = null;

  constructor(
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  groupSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService
        .getAllCompetitionGroupDefinitions(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((groups: any[]) => groups.map((g: any) => ({
      value: g.uuid || '',
      label: `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`,
      disabled: !g.isActive,
    }))));

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

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      competitionGroupId: this.defaultGroupId || '',
      boatClass: '',
      maxCrewFromTransfer: null,
      isLightweight: '',
      distanceMeters: null,
      isActive: true,
    };
    this.error = null;
    this.saving = false;
  }

  onCompetitionGroupChange(value: string | null): void {
    this.formData.competitionGroupId = value || '';
    this.cdr.markForCheck();
  }

  onBoatClassChange(value: string | null): void {
    this.formData.boatClass = value || '';
    this.cdr.markForCheck();
  }

  onIsLightweightChange(value: string | null): void {
    this.formData.isLightweight = value || '';
    this.cdr.markForCheck();
  }

  onStatusChange(value: string | null): void {
    this.formData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  get isFormValid(): boolean {
    return !!(
      this.formData.name &&
      this.formData.shortName &&
      this.formData.competitionGroupId &&
      this.formData.boatClass &&
      this.formData.maxCrewFromTransfer != null &&
      this.formData.isLightweight &&
      this.formData.distanceMeters != null && this.formData.distanceMeters > 0
    );
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: DisciplineDefinitionRequest = {
      name: this.formData.name,
      shortName: this.formData.shortName,
      competitionGroupId: this.formData.competitionGroupId,
      boatClass: this.formData.boatClass as BoatClass,
      maxCrewFromTransfer: this.formData.maxCrewFromTransfer!,
      isLightweight: this.formData.isLightweight === 'true',
      distanceMeters: this.formData.distanceMeters!,
      isActive: this.formData.isActive,
    };

    this.disciplineDefinitionsService
      .createDisciplineDefinition(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Грешка при създаване на дисциплина';
          this.cdr.markForCheck();
        },
      });
  }
}
