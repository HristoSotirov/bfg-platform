import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { AthletesService } from '../../../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const BATCH_SIZE = 100;

@Component({
  selector: 'app-batch-medical-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, ButtonComponent, DatePickerComponent],
  templateUrl: './batch-medical-dialog.component.html',
  styleUrl: './batch-medical-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchMedicalDialogComponent {
  @Input() isOpen = false;
  @Input() athleteIds: string[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  insuranceFrom: string | null = null;
  insuranceTo: string | null = null;
  medicalExaminationStartDate: string | null = null;
  medicalExaminationDurationMonths: number | null = null;

  constructor(
    private athletesService: AthletesService,
    private cdr: ChangeDetectorRef,
  ) {}

  get uniqueCount(): number {
    return this.athleteIds.length;
  }

  get isInsuranceFromRequired(): boolean {
    return !!this.insuranceTo?.trim() && !this.insuranceFrom?.trim();
  }

  get isInsuranceToRequired(): boolean {
    return !!this.insuranceFrom?.trim() && !this.insuranceTo?.trim();
  }

  get isMedicalStartDateRequired(): boolean {
    return !!this.medicalExaminationDurationMonths && !this.medicalExaminationStartDate?.trim();
  }

  get isMedicalDurationRequired(): boolean {
    return !!this.medicalExaminationStartDate?.trim() && !this.medicalExaminationDurationMonths;
  }

  close(): void {
    this.error = null;
    this.insuranceFrom = null;
    this.insuranceTo = null;
    this.medicalExaminationStartDate = null;
    this.medicalExaminationDurationMonths = null;
    this.closed.emit();
  }

  onMedicalStartDateChange(): void {
    if (this.medicalExaminationStartDate?.trim() && !this.medicalExaminationDurationMonths) {
      this.medicalExaminationDurationMonths = 12;
      this.cdr.markForCheck();
    }
  }

  onMedicalDurationChange(): void {
    this.cdr.markForCheck();
  }

  onInsuranceFromChange(): void {
    this.cdr.markForCheck();
  }

  onInsuranceToChange(): void {
    this.cdr.markForCheck();
  }


  submit(): void {
    if (this.athleteIds.length === 0) {
      this.error = 'Няма избрани състезатели.';
      this.cdr.markForCheck();
      return;
    }

    const hasInsurance = this.insuranceFrom?.trim() && this.insuranceTo?.trim();
    const hasMedical = this.medicalExaminationStartDate?.trim() && this.medicalExaminationDurationMonths;

    if (!hasInsurance && !hasMedical) {
      this.error = 'Попълнете поне една двойка: или застраховка (от/до), или медицински преглед (начална дата/продължителност).';
      this.cdr.markForCheck();
      return;
    }

    if (this.insuranceFrom?.trim() && !this.insuranceTo?.trim()) {
      this.error = 'Попълнете "Застраховка до" когато е попълнено "Застраховка от".';
      this.cdr.markForCheck();
      return;
    }
    if (this.insuranceTo?.trim() && !this.insuranceFrom?.trim()) {
      this.error = 'Попълнете "Застраховка от" когато е попълнено "Застраховка до".';
      this.cdr.markForCheck();
      return;
    }
    if (this.medicalExaminationStartDate?.trim() && !this.medicalExaminationDurationMonths) {
      this.error = 'Попълнете "Продължителност" когато е попълнена "Начална дата" на медицинския преглед.';
      this.cdr.markForCheck();
      return;
    }
    if (this.medicalExaminationDurationMonths && !this.medicalExaminationStartDate?.trim()) {
      this.error = 'Попълнете "Начална дата" когато е попълнена "Продължителност" на медицинския преглед.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const chunks: string[][] = [];
    for (let i = 0; i < this.athleteIds.length; i += BATCH_SIZE) {
      chunks.push(this.athleteIds.slice(i, i + BATCH_SIZE));
    }

    const requests = chunks.map((ids) => {
      const request: any = {
        athleteIds: ids,
      };
      
      if (hasInsurance) {
        request.insuranceFrom = this.insuranceFrom!.trim();
        request.insuranceTo = this.insuranceTo!.trim();
      }
      
      if (hasMedical) {
        request.medicalExaminationStartDate = this.medicalExaminationStartDate!.trim();
        request.medicalExaminationDurationMonths = this.medicalExaminationDurationMonths;
      }
      
      return this.athletesService
        .batchUpdateMedicalInfo(request)
        .pipe(
          catchError((err) => {
            return of({ _error: err?.error?.message || 'Грешка при обновяване' });
          }),
        );
    });

    forkJoin(requests).subscribe({
      next: (responses) => {
        const failed = responses.some((r: any) => r && r._error);
        if (failed) {
          const firstError = responses.find((r: any) => r && r._error);
          this.error = (firstError as any)?._error || 'Една или повече заявки не успяха.';
        } else {
          this.loading = false;
          this.completed.emit();
          this.close();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Грешка при запазване';
        this.cdr.markForCheck();
      },
    });
  }
}
