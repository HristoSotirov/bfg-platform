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
  CompetitionGroupDefinitionsService,
  CompetitionGroupDefinitionRequest,
  CompetitionGroupGender,
  TransferRounding,
} from '../../../../core/services/api';
import { takeUntil, Subject } from 'rxjs';

@Component({
  selector: 'app-add-competition-group-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, SearchableSelectDropdownComponent],
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
    gender: '' as CompetitionGroupGender | '',
    minAge: null as number | null,
    maxAge: null as number | null,
    maxDisciplinesPerAthlete: null as number | null,
    transferFromGroupId: '',
    minCrewForTransfer: null as number | null,
    transferRatio: null as number | null,
    transferRounding: '' as TransferRounding | '',
    transferredMaxDisciplinesPerPerson: null as number | null,
    coxRequiredWeightKg: null as number | null,
    coxMinWeightKg: null as number | null,
    lightMaxWeightKg: null as number | null,
    isActive: true,
  };

  saving = false;
  error: string | null = null;
  groupOptions: SearchableSelectOption[] = [];

  readonly genderOptions: SearchableSelectOption[] = [
    { value: CompetitionGroupGender.Male, label: 'Мъже' },
    { value: CompetitionGroupGender.Female, label: 'Жени' },
    { value: CompetitionGroupGender.Mixed, label: 'Смесени' },
  ];

  readonly statusOptions: SearchableSelectOption[] = [
    { value: 'true', label: 'Активен' },
    { value: 'false', label: 'Неактивен' },
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
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      this.loadGroups();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.destroy$.next();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private loadGroups(): void {
    this.competitionGroupDefinitionsService.getAllCompetitionGroupDefinitions(
      undefined, undefined, ['name_asc'] as any, 1000, 0
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.groupOptions = (response.content || []).map((g: any) => ({
          value: g.uuid,
          label: `${g.shortName || g.name} (${g.minAge}-${g.maxAge})`
        }));
        this.cdr.markForCheck();
      }
    });
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      shortName: '',
      gender: '' as CompetitionGroupGender | '',
      minAge: null,
      maxAge: null,
      maxDisciplinesPerAthlete: null,
      transferFromGroupId: '',
      minCrewForTransfer: null,
      transferRatio: null,
      transferRounding: '',
      transferredMaxDisciplinesPerPerson: null,
      coxRequiredWeightKg: null,
      coxMinWeightKg: null,
      lightMaxWeightKg: null,
      isActive: true,
    };
    this.error = null;
    this.saving = false;
  }

  onGenderChange(value: string | null): void {
    this.formData.gender = (value as CompetitionGroupGender | '') || '';
    this.cdr.markForCheck();
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
      this.formData.gender &&
      this.formData.minAge != null &&
      this.formData.maxAge != null &&
      this.formData.maxDisciplinesPerAthlete != null
    );
  }

  save(): void {
    if (!this.isFormValid) return;

    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    const request: CompetitionGroupDefinitionRequest = {
      name: this.formData.name,
      shortName: this.formData.shortName,
      gender: this.formData.gender as CompetitionGroupGender,
      minAge: this.formData.minAge!,
      maxAge: this.formData.maxAge!,
      maxDisciplinesPerAthlete: this.formData.maxDisciplinesPerAthlete!,
      transferFromGroupId: this.formData.transferFromGroupId || undefined,
      minCrewForTransfer: this.formData.minCrewForTransfer ?? undefined,
      transferRatio: this.formData.transferRatio ?? undefined,
      transferRounding: (this.formData.transferRounding as TransferRounding) || undefined,
      transferredMaxDisciplinesPerPerson: this.formData.transferredMaxDisciplinesPerPerson ?? undefined,
      coxRequiredWeightKg: this.formData.coxRequiredWeightKg ?? undefined,
      coxMinWeightKg: this.formData.coxMinWeightKg ?? undefined,
      lightMaxWeightKg: this.formData.lightMaxWeightKg ?? undefined,
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
            err?.error?.message || 'Грешка при създаване на състезателна група';
          this.cdr.markForCheck();
        },
      });
  }
}
