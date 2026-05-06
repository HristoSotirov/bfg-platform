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
import {
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionRequest,
  TransferRounding,
} from '../../../../core/services/api';
import { takeUntil, Subject, Observable, map } from 'rxjs';
import { fetchAllPages } from '../../../../core/utils/fetch-all-pages';

@Component({
  selector: 'app-add-competition-group-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
  templateUrl: './add-competition-group-dialog.component.html',
  styleUrl: './add-competition-group-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCompetitionGroupDialogComponent implements OnChanges {
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  formData = {
    name: '',
    shortName: '',
    minAge: null as number | null,
    maxAge: null as number | null,
    coxMinAge: null as number | null,
    coxMaxAge: null as number | null,
    maxDisciplinesPerAthlete: null as number | null,
    transferFromGroupId: '',
    minCrewForTransfer: null as number | null,
    transferRatio: null as number | null,
    transferRounding: '' as TransferRounding | '',
    transferredMaxDisciplinesPerAthlete: null as number | null,
    maleTeamCoxRequiredWeightKg: null as number | null,
    maleTeamCoxMinWeightKg: null as number | null,
    maleTeamLightMaxWeightKg: null as number | null,
    femaleTeamCoxRequiredWeightKg: null as number | null,
    femaleTeamCoxMinWeightKg: null as number | null,
    femaleTeamLightMaxWeightKg: null as number | null,
    isActive: true,
  };

  touched: Record<string, boolean> = {};

  saving = false;
  error: string | null = null;

  groupSearch = (): Observable<SearchableSelectOption[]> =>
    fetchAllPages((skip, top) =>
      this.competitionGroupDefinitionsService
        .getAllCompetitionGroupDefinitions(undefined, undefined, ['name_asc'] as any, top, skip) as any
    ).pipe(map((groups: any[]) => [
      { value: '', label: 'Няма' },
      ...groups.map((g: any) => ({
        value: g.uuid || '',
        label: `${g.shortName || g.name || '-'} (${g.minAge}-${g.maxAge ?? '∞'})`,
        disabled: !g.isActive,
      })),
    ]));

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: this.translate.instant('common.status.active') },
    { value: 'false', label: this.translate.instant('common.status.inactive') },
  ];

  readonly roundingOptions: SearchableSelectOption[] = [
    { value: '', label: 'Няма' },
    { value: TransferRounding.Floor, label: 'Закръгляне надолу (FLOOR)' },
    { value: TransferRounding.Ceil, label: 'Закръгляне нагоре (CEIL)' },
    { value: TransferRounding.Round, label: 'Закръгляне (ROUND)' },
  ];

  constructor(
    private competitionGroupDefinitionsService: CompetitionGroupDefinitionsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
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

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      minAge: null,
      maxAge: null,
      coxMinAge: null,
      coxMaxAge: null,
      maxDisciplinesPerAthlete: null,
      transferFromGroupId: '',
      minCrewForTransfer: null,
      transferRatio: null,
      transferRounding: '',
      transferredMaxDisciplinesPerAthlete: null,
      maleTeamCoxRequiredWeightKg: null,
      maleTeamCoxMinWeightKg: null,
      maleTeamLightMaxWeightKg: null,
      femaleTeamCoxRequiredWeightKg: null,
      femaleTeamCoxMinWeightKg: null,
      femaleTeamLightMaxWeightKg: null,
      isActive: true,
    };
    this.touched = {};
    this.error = null;
    this.saving = false;
  }

  onStatusChange(value: string | null): void {
    this.formData.isActive = value === 'true';
    this.cdr.markForCheck();
  }

  onRoundingChange(value: string | null): void {
    this.formData.transferRounding = (value as TransferRounding | '') || '';
    this.cdr.markForCheck();
  }

  get isFormValid(): boolean {
    return !!(
      this.formData.name &&
      this.formData.shortName &&
      this.formData.minAge != null &&
      this.formData.maxAge != null &&
      this.formData.maxDisciplinesPerAthlete != null
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

    const request: CompetitionGroupDefinitionRequest = {
      name: this.formData.name.trim(),
      shortName: this.formData.shortName.trim(),
      minAge: this.formData.minAge!,
      maxAge: this.formData.maxAge!,
      coxMinAge: this.formData.coxMinAge ?? undefined,
      coxMaxAge: this.formData.coxMaxAge ?? undefined,
      maxDisciplinesPerAthlete: this.formData.maxDisciplinesPerAthlete!,
      transferFromGroupId: this.formData.transferFromGroupId || undefined,
      minCrewForTransfer: this.formData.minCrewForTransfer ?? undefined,
      transferRatio: this.formData.transferRatio ?? undefined,
      transferRounding: (this.formData.transferRounding as TransferRounding) || undefined,
      transferredMaxDisciplinesPerAthlete: this.formData.transferredMaxDisciplinesPerAthlete ?? undefined,
      maleTeamCoxRequiredWeightKg: this.formData.maleTeamCoxRequiredWeightKg ?? undefined,
      maleTeamCoxMinWeightKg: this.formData.maleTeamCoxMinWeightKg ?? undefined,
      maleTeamLightMaxWeightKg: this.formData.maleTeamLightMaxWeightKg ?? undefined,
      femaleTeamCoxRequiredWeightKg: this.formData.femaleTeamCoxRequiredWeightKg ?? undefined,
      femaleTeamCoxMinWeightKg: this.formData.femaleTeamCoxMinWeightKg ?? undefined,
      femaleTeamLightMaxWeightKg: this.formData.femaleTeamLightMaxWeightKg ?? undefined,
      isActive: this.formData.isActive,
    };

    this.competitionGroupDefinitionsService
      .createCompetitionGroupDefinition(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err?.error?.message || this.translate.instant('competitionGroups.form.createError');
          this.cdr.markForCheck();
        },
      });
  }
}
