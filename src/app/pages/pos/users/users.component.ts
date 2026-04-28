import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { RadioFieldComponent } from '../../../components/form/radio-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { CommonService } from '../../../services/common.service';
import { RoleService } from '../../../services/role.service';
import { UserMaster, UserMasterService } from '../../../services/usermaster.service';

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
  BranchNames: string[];
  RoleNames: string[];
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
    MultiSelectFieldComponent,
    DateFieldComponent,
    RadioFieldComponent,
    ActionButtonsComponent,
    MenuModule
  ],
  providers: [ConfirmationService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly branchService = inject(BranchService);
  private readonly roleService = inject(RoleService);
  private readonly userMasterService = inject(UserMasterService);
  private readonly commonService = inject(CommonService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;
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
  dialogBranches: MultiSelectFieldValue = [];
  dialogRoles: MultiSelectFieldValue = [];

  selectedRow: UserRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: UserRow[] = [];
  tableRows: UserRow[] = [];
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  branchOptions: any[] = [];
  roleOptions: any[] = [];
  userDetails: any = {};

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


  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadUsers();
  }

  resetForm(): void {
    this.filterName = '';
    this.filterEmail = '';
    this.loadUsers();
  }

  searchUsers(): void {
    const name = this.filterName.trim().toLowerCase();
    const email = this.filterEmail.trim().toLowerCase();

    if (!name && !email) {
      this.loadUsers();
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
    void this.loadBranches();
    void this.loadRoles();
    void this.loadCountries();
  }

  closeAddDialog(): void {
    this.loadUsers();
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  loadUsers(): void {
    this.userMasterService.getAll(Number(this.userDetails.OrgId || 0)).subscribe({
      next: (response) => {
        this.tableRows = (response.result ?? []).map((x: any) => {
          x.ContactNumber = x.ContactNo ? String(x.ContactNo) : '';
          x.ImageUrl = x.Image ?? '';
          x.DateOfBirth = x.DOB ? new Date(x.DOB) : null;
          x.IsAdmin = x.IsAdmin === true ? 'Yes' : 'No';
          x.Status = x.IsActive ? 'Active' : 'Inactive';
          return x;
        });

        this.allRows = this.tableRows;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.allRows = [];
        this.tableRows = [];
        this.toast.error('Load Failed', 'Unable to load users. Please check API and try again.');
      }
    });
  }

  async loadBranches(): Promise<void> {
    const orgId = Number(this.userDetails.OrgId || 0);

    if (!orgId) {
      this.branchOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      const branches = response?.result ?? [];

      this.branchOptions = branches.map((branch: any) => ({
        label: branch.Name ?? '',
        value: branch.Id ?? 0
      }));
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async loadRoles(): Promise<void> {
    const orgId = Number(this.userDetails.OrgId || 0);

    if (!orgId) {
      this.roleOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.roleService.getAll(orgId));
      const roles = response?.result ?? [];

      this.roleOptions = roles.map((role: any) => ({
        label: role.Name ?? '',
        value: role.Id ?? 0
      }));
    } catch {
      this.roleOptions = [];
      this.toast.error('Load Failed', 'Unable to load roles. Please check and try again.');
    }
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

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const payload: UserMaster = {
      Id: this.dialogId,
      Code: this.dialogCode,
      Name: this.dialogName,
      Remarks: this.dialogRemarks,
      IsAdmin: this.dialogIsAdmin === 'Yes',
      Email: this.dialogEmail,
      ContactNo: Number(this.dialogContactNumber || 0),
      OrgId: Number(this.userDetails.OrgId || 0),
      Image: this.dialogImageUrl,
      EmpCode: this.dialogEmpCode,
      Gender: Number(this.dialogGender || 0),
      DOB: this.dialogDateOfBirth ? this.dialogDateOfBirth.toISOString() : null,
      Age: Number(this.dialogAge || 0),
      Address1: this.dialogAddress1,
      Address2: this.dialogAddress2,
      Country: Number(this.dialogCountry || 0),
      State: Number(this.dialogState || 0),
      City: Number(this.dialogCity || 0),
      PostalCode: this.dialogPostalCode,
      UserBranchMapping: this.dialogBranches.map((branchId) => ({
        Id: 0,
        UserId: this.dialogId  ||0,
        BranchId: Number(branchId || 0),
        IsActive: true,
        CreatedBy: Number(this.userDetails.UserId || 0),
        CreatedDate: new Date().toISOString(),
        UpdatedBy: Number(this.userDetails.UserId || 0),
        UpdatedDate: null,
        IsDeleted: false
      })),
      UserRoleMapping: this.dialogRoles.map((roleId) => ({
        Id: 0,
        UserId: this.dialogId ||0,
        RoleId: Number(roleId || 0),
        IsActive: true,
        CreatedBy: Number(this.userDetails.UserId || 0),
        CreatedDate: new Date().toISOString(),
        UpdatedBy: Number(this.userDetails.UserId || 0),
        UpdatedDate: null,
        IsDeleted: false
      })),
      IsActive: true,
      CreatedBy: Number(this.userDetails.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails.UserId || 0),
      UpdatedDate: null,
      IsDeleted: false
    };

    try {
      let response: any;

      if (!payload.Id) {
        response = await firstValueFrom(this.userMasterService.create(payload));
      } else {
        response = await firstValueFrom(this.userMasterService.update(payload));
      }

      if (response.ErrorInfo.Message === true && response.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogName = '';
        return;
      }

      if (response.ErrorInfo.Message === true && !payload.Id) {
        this.toast.success('Saved', `${payload.Name || this.pageTitle} saved successfully.`);
        this.closeAddDialog();
        return;
      }

      if (response.ErrorInfo.Message === true && payload.Id) {
        this.toast.success('Updated', `${payload.Name || this.pageTitle} updated successfully.`);
        this.closeAddDialog();
        return;
      }

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save user.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save user.');
    }
  }

  async editRow(row: UserRow): Promise<void> {
    this.isEditMode = true;
    this.dialogTitle = 'Edit User';
    this.dialogSubtitle = 'Update the selected user profile.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.userMasterService.getById(row.Id ?? 0));
      const user = response.result ?? {};

      this.dialogId = user.Id ?? 0;
      this.dialogCode = user.Code ?? '';
      this.dialogName = user.Name ?? '';
      this.dialogRemarks = user.Remarks ?? '';
      this.dialogEmail = user.Email ?? '';
      this.dialogContactNumber = user.ContactNo ? String(user.ContactNo) : '';
      this.dialogEmpCode = user.EmpCode ?? '';
      this.dialogImageName = '';
      this.dialogImageUrl = user.Image ?? '';
      this.dialogGender = user.Gender ? String(user.Gender) : null;
      this.dialogDateOfBirth = user.DOB ? new Date(user.DOB) : null;
      this.dialogAge = String(user.Age || '');
      this.dialogIsAdmin = user.IsAdmin === true ? 'Yes' : 'No';
      this.dialogAddress1 = user.Address1 ?? '';
      this.dialogAddress2 = user.Address2 ?? '';
      this.dialogPostalCode = user.PostalCode ?? '';
      this.dialogBranches = (user.UserBranchMapping ?? []).map((branch: any) => Number(branch.BranchId || 0));
      this.dialogRoles = (user.UserRoleMapping ?? []).map((role: any) => Number(role.RoleId || 0));

      await this.loadBranches();
      await this.loadRoles();
      await this.loadCountries();
      this.dialogCountry = user.Country || null;

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = user.State || null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = user.City || null;
    } catch {
      this.toast.error('Load Failed', 'Unable to load user details. Please check and try again.');
    }
  }

  async deleteRow(row: UserRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.userMasterService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadUsers();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: UserRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.userMasterService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadUsers();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: UserRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.userMasterService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadUsers();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
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
    const areMultiSelectFieldsValid = this.multiSelectFields?.toArray().every((field) => field.isValid) ?? true;
    const areDateFieldsValid = this.dateFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid && areMultiSelectFieldsValid && areDateFieldsValid;
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
    this.dialogBranches = [];
    this.dialogRoles = [];
  }
}
