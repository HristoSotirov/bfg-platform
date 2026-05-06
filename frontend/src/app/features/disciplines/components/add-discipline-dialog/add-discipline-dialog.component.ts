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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchableSelectDropdownComponent, SearchableSelectOption } from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { ValueHelpColumn } from '../../../../shared/components/value-help-dialog/value-help-dialog.component';
import {
  DisciplineDefinitionsService,
  DisciplineDefinitionRequest,
  CompetitionGroupDefinitionsService,
} from '../../../../core/services/api';
import { BoatClass } from '../../../../core/services/api/model/boatClass';
import { DisciplineGender } from '../../../../core/services/api/model/disciplineGender';
import { Observable, takeUntil, Subject, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-discipline-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
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
    gender: '' as string,
    competitionGroupId: '',
    boatClass: '' as string,
    maxCrewFromTransfer: null as number | null,
    isLightweight: '' as string,
    distanceMeters: null as number | null,
    maxBoatsPerClub: null as number | null,
    isActive: true,
  };

  touched: Record<string, boolean> = {};

  readonly genderOptions: SearchableSelectOption[] = [
    { value: DisciplineGender.Male, label: 'Мъже' },
    { value: DisciplineGender.Female, label: 'Жени' },
    { value: DisciplineGender.Mixed, label: 'Смесени' },
  ];

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
    { value: 'true', label: this.translate.instant('common.status.active') },
    { value: 'false', label: this.translate.instant('common.status.inactive') },
  ];

  saving = false;
  error: string | null = null;

  constructor(
    private disciplineDefinitionsService: DisciplineDefinitionsService,
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
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

  groupValueHelpColumns: ValueHelpColumn[] = [
    { key: 'shortName', label: this.translate.instant('competitionGroups.columns.shortName') },
    { key: 'name', label: this.translate.instant('competitionGroups.columns.name') },
    { key: 'ageRange', label: this.translate.instant('competitionGroups.columns.ageRange') },
  ];

  groupValueHelpSearch = (query: string): Observable<any[]> =>
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService
        .getAllCompetitionGroupDefinitions(undefined, query || undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((groups: any[]) => groups.map((g: any) => ({
      uuid: g.uuid || '',
      shortName: g.shortName || '-',
      name: g.name || '-',
      ageRange: `${g.minAge ?? '-'} - ${g.maxAge ?? '∞'}`,
      isInactive: !g.isActive,
    }))));

  isGroupDisabled = (row: any): boolean => row.isInactive;
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
      gender: '',
      competitionGroupId: this.defaultGroupId || '',
      boatClass: '',
      maxCrewFromTransfer: null,
      isLightweight: '',
      distanceMeters: null,
      maxBoatsPerClub: null,
      isActive: true,
    };
    this.touched = {};
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

  onGenderChange(value: string | null): void {
    this.formData.gender = value || '';
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
      this.formData.gender &&
      this.formData.competitionGroupId &&
      this.formData.boatClass &&
      this.formData.maxCrewFromTransfer != null &&
      this.formData.isLightweight &&
      this.formData.distanceMeters != null && this.formData.distanceMeters > 0 &&
      this.formData.maxBoatsPerClub != null && this.formData.maxBoatsPerClub > 0
    );
  }

  save(): void {
    this.touched['shortName'] = true;
    this.touched['name'] = true;
    this.cdr.markForCheck();
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: DisciplineDefinitionRequest = {
      name: this.formData.name.trim(),
      shortName: this.formData.shortName.trim(),
      gender: this.formData.gender as DisciplineGender,
      competitionGroupId: this.formData.competitionGroupId,
      boatClass: this.formData.boatClass as BoatClass,
      maxCrewFromTransfer: this.formData.maxCrewFromTransfer!,
      isLightweight: this.formData.isLightweight === 'true',
      distanceMeters: this.formData.distanceMeters!,
      maxBoatsPerClub: this.formData.maxBoatsPerClub!,
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
          this.error = err?.error?.message || this.translate.instant('disciplines.form.createError');
          this.cdr.markForCheck();
        },
      });
  }
}
