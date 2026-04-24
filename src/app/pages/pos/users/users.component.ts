import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { RadioFieldComponent } from '../../../components/form/radio-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { CommonService } from '../../../services/common.service';

type UserRow = {
  Id: number;
  Code: string;
  Name: string;
  Remarks: string;
  Email: string;
  ContactNumber: string;
  EmpCode: string;
  ImageName: string;
  ImageUrl: string;
  Gender: string;
  GenderName: string;
  DateOfBirth: Date | null;
  Age: number;
  IsAdmin: string;
  Address1: string;
  Address2: string;
  Country: number;
  State: number;
  City: number;
  PostalCode: string;
  RoleName: string;
  OrganizationName: string;
  Status: string;
  IsActive: boolean;
};

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];

const GENDER_OPTIONS = [
  { label: 'Male', value: '1' },
  { label: 'Female', value: '2' },
  { label: 'Others', value: '3' }
];

const IS_ADMIN_OPTIONS = [
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' }
];

const SAMPLE_USERS: UserRow[] = [
  {
    Id: 1,
    Code: 'USR001',
    Name: 'Antony Raj',
    Remarks: 'Main admin user',
    Email: 'antony@unityworkpos.com',
    ContactNumber: '9876543210',
    EmpCode: 'EMP001',
    ImageName: '',
    ImageUrl: '',
    Gender: '1',
    GenderName: 'Male',
    DateOfBirth: new Date('1994-06-12'),
    Age: 31,
    IsAdmin: 'Yes',
    Address1: '12 Lake View Road',
    Address2: 'Anna Nagar',
    Country: 1,
    State: 1,
    City: 1,
    PostalCode: '600040',
    RoleName: 'Administrator',
    OrganizationName: 'Unity Work POS',
    Status: 'Active',
    IsActive: true
  },
  {
    Id: 2,
    Code: 'USR002',
    Name: 'Priya Devi',
    Remarks: 'Billing supervisor',
    Email: 'priya@unityworkpos.com',
    ContactNumber: '9123456780',
    EmpCode: 'EMP002',
    ImageName: '',
    ImageUrl: '',
    Gender: '2',
    GenderName: 'Female',
    DateOfBirth: new Date('1997-02-18'),
    Age: 29,
    IsAdmin: 'No',
    Address1: '25 Market Street',
    Address2: 'T Nagar',
    Country: 1,
    State: 1,
    City: 1,
    PostalCode: '600017',
    RoleName: 'Cashier',
    OrganizationName: 'Unity Work POS',
    Status: 'Active',
    IsActive: true
  },
  {
    Id: 3,
    Code: 'USR003',
    Name: 'Rahul Kumar',
    Remarks: 'Kitchen operations user',
    Email: 'rahul@unityworkpos.com',
    ContactNumber: '9012345678',
    EmpCode: 'EMP003',
    ImageName: '',
    ImageUrl: '',
    Gender: '1',
    GenderName: 'Male',
    DateOfBirth: new Date('1995-10-05'),
    Age: 30,
    IsAdmin: 'No',
    Address1: '8 MG Road',
    Address2: 'Velachery',
    Country: 1,
    State: 1,
    City: 1,
    PostalCode: '600042',
    RoleName: 'Manager',
    OrganizationName: 'Unity Work POS',
    Status: 'Inactive',
    IsActive: false
  },
  {
    Id: 4,
    Code: 'USR004',
    Name: 'Meena Joseph',
    Remarks: 'Front office user',
    Email: 'meena@unityworkpos.com',
    ContactNumber: '9988776655',
    EmpCode: 'EMP004',
    ImageName: '',
    ImageUrl: '',
    Gender: '2',
    GenderName: 'Female',
    DateOfBirth: new Date('1998-11-23'),
    Age: 27,
    IsAdmin: 'No',
    Address1: '41 Beach Road',
    Address2: 'Adyar',
    Country: 1,
    State: 1,
    City: 1,
    PostalCode: '600020',
    RoleName: 'Reception',
    OrganizationName: 'Unity Work POS',
    Status: 'Active',
    IsActive: true
  }
];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    SelectFieldComponent,
    DateFieldComponent,
    RadioFieldComponent,
    ActionButtonsComponent,
    MenuModule
  ],
  providers: [ConfirmationService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly commonService = inject(CommonService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(DateFieldComponent) private readonly dateFields?: QueryList<DateFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  filterName = '';
  filterEmail = '';

  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';
  dialogEmail = '';
  dialogContactNumber = '';
  dialogEmpCode = '';
  dialogImageName = '';
  dialogImageUrl = '';
  dialogGender: string | null = null;
  dialogDateOfBirth: Date | null = null;
  dialogAge = '';
  dialogIsAdmin: string | null = 'No';
  dialogAddress1 = '';
  dialogAddress2 = '';
  dialogCountry: SelectFieldValue = null;
  dialogState: SelectFieldValue = null;
  dialogCity: SelectFieldValue = null;
  dialogPostalCode = '';
  dialogRoleName = '';
  dialogOrganizationName = '';

  selectedRow: UserRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: UserRow[] = [];
  tableRows: UserRow[] = [];
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;

  readonly pageEyebrow = 'Users & Roles';
  readonly pageTitle = 'Users';
  readonly pageSubtitle = 'Maintain user master details.';
  readonly genderOptions = GENDER_OPTIONS;
  readonly isAdminOptions = IS_ADMIN_OPTIONS;
  readonly filterTitle = 'User Filters';
  readonly primaryActionLabel = 'Search Users';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create User';
  dialogSubtitle = 'Create a new user profile.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Users';
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;

  constructor() {
    this.allRows = [...SAMPLE_USERS];
    this.tableRows = [...SAMPLE_USERS];
  }

  resetForm(): void {
    this.filterName = '';
    this.filterEmail = '';
    this.tableRows = [...this.allRows];
  }

  searchUsers(): void {
    const name = this.filterName.trim().toLowerCase();
    const email = this.filterEmail.trim().toLowerCase();

    if (!name && !email) {
      return;
    }

    this.tableRows = this.allRows.filter((row) => {
      const matchesName = !name || row.Name.toLowerCase().includes(name);
      const matchesEmail = !email || row.Email.toLowerCase().includes(email);
      return matchesName && matchesEmail;
    });
  }

  openFilterSidebar(): void {
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create User';
    this.dialogSubtitle = 'Create a new user profile.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
    void this.loadCountries();
  }

  closeAddDialog(): void {
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async loadCountries(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.commonService.GetCountry());
      const countries = response?.result ?? [];

      this.countryOptions = countries.map((country: any) => ({
        label: country.Name ?? '',
        value: country.Id ?? 0
      }));
    } catch {
      this.countryOptions = [];
      this.toast.error('Load Failed', 'Unable to load countries. Please check and try again.');
    }
  }

  onCountryChange(value: SelectFieldValue): void {
    this.dialogCountry = value;
    this.dialogState = null;
    this.dialogCity = null;
    this.stateOptions = [];
    this.cityOptions = [];

    if (!value || Number(value) === 0) {
      return;
    }

    void this.loadStates(Number(value));
  }

  async loadStates(countryId: number): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.commonService.GetStateByCountryId(countryId));
      const states = response?.result ?? [];

      this.stateOptions = states.map((state: any) => ({
        label: state.Name ?? '',
        value: state.Id ?? 0
      }));
    } catch {
      this.stateOptions = [];
      this.toast.error('Load Failed', 'Unable to load states. Please check and try again.');
    }
  }

  onStateChange(value: SelectFieldValue): void {
    this.dialogState = value;
    this.dialogCity = null;
    this.cityOptions = [];

    if (!value || Number(value) === 0) {
      return;
    }

    void this.loadCities(Number(value));
  }

  async loadCities(stateId: number): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.commonService.GetCityByStateId(stateId));
      const cities = response?.result ?? [];

      this.cityOptions = cities.map((city: any) => ({
        label: city.Name ?? '',
        value: city.Id ?? 0
      }));
    } catch {
      this.cityOptions = [];
      this.toast.error('Load Failed', 'Unable to load cities. Please check and try again.');
    }
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const userRow: UserRow = {
      Id: this.dialogId || Date.now(),
      Code: this.dialogCode,
      Name: this.dialogName,
      Remarks: this.dialogRemarks,
      Email: this.dialogEmail,
      ContactNumber: this.dialogContactNumber,
      EmpCode: this.dialogEmpCode,
      ImageName: this.dialogImageName,
      ImageUrl: this.dialogImageUrl,
      Gender: this.dialogGender ?? '',
      GenderName: this.getGenderName(this.dialogGender),
      DateOfBirth: this.dialogDateOfBirth,
      Age: Number(this.dialogAge || 0),
      IsAdmin: this.dialogIsAdmin ?? 'No',
      Address1: this.dialogAddress1,
      Address2: this.dialogAddress2,
      Country: Number(this.dialogCountry || 0),
      State: Number(this.dialogState || 0),
      City: Number(this.dialogCity || 0),
      PostalCode: this.dialogPostalCode,
      RoleName: this.dialogRoleName,
      OrganizationName: this.dialogOrganizationName,
      Status: 'Active',
      IsActive: true
    };

    if (this.isEditMode) {
      this.allRows = this.allRows.map((row) => row.Id === userRow.Id ? { ...userRow, Status: row.Status, IsActive: row.IsActive } : row);
      this.toast.success('Updated', `${userRow.Name || this.pageTitle} updated successfully.`);
    } else {
      this.allRows = [...this.allRows, userRow];
      this.toast.success('Saved', `${userRow.Name || this.pageTitle} saved successfully.`);
    }

    this.tableRows = [...this.allRows];
    this.closeAddDialog();
  }

  async editRow(row: UserRow): Promise<void> {
    this.dialogId = row.Id;
    this.dialogCode = row.Code;
    this.dialogName = row.Name;
    this.dialogRemarks = row.Remarks;
    this.dialogEmail = row.Email;
    this.dialogContactNumber = row.ContactNumber;
    this.dialogEmpCode = row.EmpCode;
    this.dialogImageName = row.ImageName;
    this.dialogImageUrl = row.ImageUrl;
    this.dialogGender = row.Gender;
    this.dialogDateOfBirth = row.DateOfBirth ? new Date(row.DateOfBirth) : null;
    this.dialogAge = String(row.Age || '');
    this.dialogIsAdmin = row.IsAdmin;
    this.dialogAddress1 = row.Address1;
    this.dialogAddress2 = row.Address2;
    this.dialogPostalCode = row.PostalCode;
    this.dialogRoleName = row.RoleName;
    this.dialogOrganizationName = row.OrganizationName;
    this.isEditMode = true;
    this.dialogTitle = 'Edit User';
    this.dialogSubtitle = 'Update the selected user profile.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    await this.loadCountries();
    this.dialogCountry = row.Country || null;

    if (this.dialogCountry) {
      await this.loadStates(Number(this.dialogCountry));
    }

    this.dialogState = row.State || null;

    if (this.dialogState) {
      await this.loadCities(Number(this.dialogState));
    }

    this.dialogCity = row.City || null;
  }

  deleteRow(row: UserRow): void {
    this.allRows = this.allRows.filter((x) => x.Id !== row.Id);
    this.tableRows = [...this.allRows];
    this.toast.success('Deleted', `${row.Name || 'User'} deleted successfully.`);
  }

  activateRow(row: UserRow): void {
    this.allRows = this.allRows.map((x) =>
      x.Id === row.Id ? { ...x, IsActive: true, Status: 'Active' } : x
    );
    this.tableRows = [...this.allRows];
    this.toast.success('Activated', `${row.Name || 'User'} activated successfully.`);
  }

  deactivateRow(row: UserRow): void {
    this.allRows = this.allRows.map((x) =>
      x.Id === row.Id ? { ...x, IsActive: false, Status: 'Inactive' } : x
    );
    this.tableRows = [...this.allRows];
    this.toast.success('Deactivated', `${row.Name || 'User'} deactivated successfully.`);
  }

  openRowActions(menu: any, event: Event, row: UserRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: UserRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${row.Name || 'this user'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: UserRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: `Are you sure you want to activate ${row.Name || 'this user'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: UserRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: `Are you sure you want to deactivate ${row.Name || 'this user'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  onDateOfBirthChange(value: Date | null): void {
    this.dialogDateOfBirth = value;
    this.dialogAge = value ? String(this.calculateAge(value)) : '';
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.dialogImageName = file?.name ?? '';

    if (!file) {
      this.dialogImageUrl = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.dialogImageUrl = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  getUserImage(row: UserRow): string {
    if (row.ImageUrl) {
      return row.ImageUrl;
    }

    const initials = encodeURIComponent((row.Name || 'U').trim().charAt(0).toUpperCase());
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='24' fill='%23e2e8f0'/><circle cx='60' cy='44' r='20' fill='%2394a3b8'/><path d='M24 102c6-18 20-28 36-28s30 10 36 28' fill='%2394a3b8'/><text x='60' y='112' text-anchor='middle' font-size='18' font-family='Arial' fill='%23475569'>${initials}</text></svg>`;
  }

  private getGenderName(gender: string | null): string {
    return this.genderOptions.find((x) => x.value === gender)?.label as string ?? '';
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDifference = today.getMonth() - dateOfBirth.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  private getRowActionItems(row: UserRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive === true) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    return items;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
    const areDateFieldsValid = this.dateFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid && areDateFieldsValid;
  }

  private resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogRemarks = '';
    this.dialogEmail = '';
    this.dialogContactNumber = '';
    this.dialogEmpCode = '';
    this.dialogImageName = '';
    this.dialogImageUrl = '';
    this.dialogGender = null;
    this.dialogDateOfBirth = null;
    this.dialogAge = '';
    this.dialogIsAdmin = 'No';
    this.dialogAddress1 = '';
    this.dialogAddress2 = '';
    this.dialogCountry = null;
    this.dialogState = null;
    this.dialogCity = null;
    this.dialogPostalCode = '';
    this.dialogRoleName = '';
    this.dialogOrganizationName = '';
  }
}
