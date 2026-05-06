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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  SearchableSelectDropdownComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select-dropdown/searchable-select-dropdown.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { AccreditationsService, ClubDto } from '../../../../core/services/api';
import { Gender } from '../../../../core/services/api/model/gender';
import { catchError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-add-athlete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    ButtonComponent,
    SearchableSelectDropdownComponent,
    DatePickerComponent,
    TranslateModule,
  ],
  templateUrl: './add-athlete-dialog.component.html',
  styleUrl: './add-athlete-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAthleteDialogComponent {
  @Input() isOpen = false;
  @Input() userClub: ClubDto | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  formData = {
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
  };

  touched: Record<string, boolean> = {};

  loading = false;
  error: string | null = null;
  isConfirmDialogOpen = false;

  genderOptions: SearchableSelectOption[] = [
    { value: Gender.MALE, label: this.translateService.instant('accreditations.gender.male') },
    { value: Gender.FEMALE, label: this.translateService.instant('accreditations.gender.female') },
  ];

  constructor(
    private accreditationsService: AccreditationsService,
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  close(): void {
    this.formData = {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '' as Gender | '',
    };
    this.touched = {};
    this.error = null;
    this.loading = false;
    this.closed.emit();
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    this.touched['firstName'] = true;
    this.touched['lastName'] = true;
    this.touched['gender'] = true;
    this.touched['dateOfBirth'] = true;
    this.cdr.markForCheck();
    if (!this.formData.firstName?.trim()) {
      this.error = this.translateService.instant('accreditations.addAthleteDialog.validation.firstNameRequired');
      this.cdr.markForCheck();
      return;
    }
    if (!this.formData.middleName?.trim()) {
      this.error = this.translateService.instant('accreditations.addAthleteDialog.validation.middleNameRequired');
      this.cdr.markForCheck();
      return;
    }
    if (!this.formData.lastName?.trim()) {
      this.error = this.translateService.instant('accreditations.addAthleteDialog.validation.lastNameRequired');
      this.cdr.markForCheck();
      return;
    }
    if (!this.formData.dateOfBirth) {
      this.error = this.translateService.instant('accreditations.addAthleteDialog.validation.dateOfBirthRequired');
      this.cdr.markForCheck();
      return;
    }
    if (!this.formData.gender) {
      this.error = this.translateService.instant('accreditations.addAthleteDialog.validation.genderRequired');
      this.cdr.markForCheck();
      return;
    }

    this.isConfirmDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirmDialog(): void {
    this.isConfirmDialogOpen = false;
    this.cdr.markForCheck();
  }

  confirmSubmit(): void {
    this.isConfirmDialogOpen = false;
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const request = {
      firstName: this.formData.firstName.trim(),
      middleName: this.formData.middleName.trim(),
      lastName: this.formData.lastName.trim(),
      dateOfBirth: this.formData.dateOfBirth,
      gender: this.formData.gender as Gender,
    };

    const createMethod = (this.accreditationsService as any)
      .createAthleteWithAccreditation;
    const apiCall =
      createMethod && typeof createMethod === 'function'
        ? createMethod.call(this.accreditationsService, request)
        : this.makeDirectHttpCall(request);

    apiCall
      .pipe(
        catchError((err) => {
          console.error('[AddAthleteDialog] Error creating athlete:', err);
          this.loading = false;
          this.error =
            err?.error?.message ||
            err?.message ||
            this.translateService.instant('accreditations.addAthleteDialog.errors.createFailed');
          this.cdr.markForCheck();
          return [];
        }),
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.created.emit();
          this.close();
        },
        error: (err: any) => {
          console.error('[AddAthleteDialog] Subscribe error:', err);
          this.loading = false;
          this.error =
            err?.error?.message ||
            err?.message ||
            this.translateService.instant('accreditations.addAthleteDialog.errors.createFailed');
          this.cdr.markForCheck();
        },
      });
  }

  private makeDirectHttpCall(request: any): any {
    const basePath =
      (this.accreditationsService as any).configuration?.basePath ||
      'http://localhost:8080';
    const url = `${basePath}/accreditations`;

    const serviceHeaders = (this.accreditationsService as any).defaultHeaders;
    let headers = new HttpHeaders();
    if (serviceHeaders) {
      serviceHeaders.keys().forEach((key: string) => {
        const values = serviceHeaders.getAll(key);
        if (values) {
          values.forEach((value: string) => {
            headers = headers.append(key, value);
          });
        }
      });
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    headers = headers.set('Content-Type', 'application/json');

    return this.httpClient.post(url, request, {
      headers: headers,
      withCredentials:
        (this.accreditationsService as any).configuration?.withCredentials ||
        false,
    });
  }
}
