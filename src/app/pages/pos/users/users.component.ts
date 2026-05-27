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
import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { RoleService } from '../../../services/role.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';
import { UserBranchMapping, UserMaster, UserMasterService, UserRoleMapping } from '../../../services/usermaster.service';

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
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly organizationService = inject(OrganizationService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;
  @ViewChildren(DateFieldComponent) private readonly dateFields?: QueryList<DateFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  filterOrganizations: MultiSelectFieldValue = [];
  cardSearchText = '';

  dialogId = 0;
  dialogOrganization: SelectFieldValue = null;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';
  dialogEmail = '';
  dialogContactNumber = '';
  dialogEmpCode = '';
  dialogImageName = '';
  dialogImage = '';
  dialogImageUrl = '';
  dialogImageFile: File | null = null;
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
  dialogUserBranchMappings: UserBranchMapping[] = [];
  dialogUserRoleMappings: UserRoleMapping[] = [];

  selectedRow: any = null;
  rowActionItems: MenuItem[] = [];
  masterRows: any[] = [];
  allRows: any[] = [];
  tableRows: any[] = [];
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  organizationOptions: any[] = [];
  branchOptions: any[] = [];
  roleOptions: any[] = [];
  userDetails: any = {};
  userEntityNo = Number(sessionStorage.getItem('currentMenuEntityNo') || 0);

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
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showFilterButton = false;
  showRowActions = true;
  userRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.showFilterButton = this.userDetails.RoleId === 1;
    await this.loadUserRights();
    this.loadUsers();
  }

  async loadUserRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.userEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.userRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.userRights.Create;
      this.showRowActions = this.userRights.Edit || this.userRights.Delete || this.userRights.ActiveInActive || this.userRights.Print;
    } catch {
      this.userRights = {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        ActiveInActive: false,
        Print: false,
        Download: false
      };
      this.showAddNewButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load user role rights. Please check and try again.');
    }
  }

  resetForm(): void {
    this.filterOrganizations = [];
    this.allRows = [...this.masterRows];
    this.applyCardSearch();
  }

  onCardSearchChange(value: string): void {
    this.cardSearchText = value;
    this.applyCardSearch();
  }

  searchUsers(): void {
    if (!this.filterOrganizations.length) {
      this.allRows = [...this.masterRows];
      this.applyCardSearch();
      return;
    }

    this.allRows = this.masterRows.filter((row) =>
      this.filterOrganizations.includes(Number(row.OrgId || 0))
    );

    this.applyCardSearch();
  }

  openFilterSidebar(): void {
    this.resetForm();
    if (!this.organizationOptions.length) {
      this.loadOrganizations();
    }
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create User';
    this.dialogSubtitle = 'Create a new user profile.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.userDetails.RoleId === 1) {
      await this.loadOrganizations();
    } else {
      await this.loadLatestUserCode(Number(this.userDetails.OrgId || 0));
      await this.loadBranches();
      await this.loadRoles();
    }
    await this.loadCountries();
  }

  closeAddDialog(): void {
    this.loadUsers();
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  loadUsers(): void {
    const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);

    this.userMasterService.getAll(orgId).subscribe({
      next: (response) => {

        this.tableRows = (response.result ?? []).map((x: any) => {
          x.ContactNumber = x.ContactNo ? String(x.ContactNo) : '';
          x.Image = this.normalizeImageValue(x.Image ?? '');
          x.ImageUrl = this.getImagePreviewUrl(x.Image ?? '');
          x.DateOfBirth = x.DOB ? new Date(x.DOB) : null;
          x.OrganizationName = x.OrganizationName ?? x.OrgName ?? '';
          x.IsAdmin = x.IsAdmin === true ? 'Yes' : 'No';
          x.GenderName = this.getGenderName(x.Gender ? String(x.Gender) : null);
          x.Status = x.IsActive ? 'Active' : 'Inactive';
          return x;
        });

        this.masterRows = [...this.tableRows];
        this.allRows = [...this.masterRows];
        this.applyCardSearch();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.allRows = [];
        this.tableRows = [];
        this.toast.error('Load Failed', 'Unable to load users. Please check API and try again.');
      }
    });
  }

  async loadOrganizations(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      const organizations = response?.result ?? [];

      this.organizationOptions = organizations.filter((org: any) => org.IsActive).map((organization: any) => ({
        label: organization.Name ?? '',
        value: organization.Id ?? 0
      }));
    } catch {
      this.organizationOptions = [];
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  async loadBranches(orgId?: number): Promise<void> {
    const selectedOrgId = Number(orgId || this.userDetails.OrgId || 0);

    if (!selectedOrgId) {
      this.branchOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(selectedOrgId));
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

  async loadRoles(orgId?: number): Promise<void> {
    const selectedOrgId = Number(orgId || this.userDetails.OrgId || 0);

    if (!selectedOrgId) {
      this.roleOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.roleService.getAll(selectedOrgId));
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

    this.loadStates(Number(value));
  }

  async onOrganizationChange(value: SelectFieldValue): Promise<void> {
    this.dialogOrganization = value;
    this.dialogBranches = [];
    this.dialogRoles = [];
    this.branchOptions = [];
    this.roleOptions = [];

    if (!value || Number(value) === 0) {
      this.dialogCode = '';
      return;
    }

    if (!this.isEditMode) {
      await this.loadLatestUserCode(Number(value));
    }

    await this.loadBranches(Number(value));
    await this.loadRoles(Number(value));
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

    this.loadCities(Number(value));
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
      ContactNo: this.dialogContactNumber.trim(),
      OrgId: this.userDetails.RoleId === 1
        ? Number(this.dialogOrganization || 0)
        : Number(this.userDetails.OrgId || 0),
      Image: this.dialogImage,
      ImageFile: this.dialogImageFile,
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
        Id: this.dialogUserBranchMappings.find((x) => Number(x.BranchId || 0) === Number(branchId || 0))?.Id ?? 0,
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
        Id: this.dialogUserRoleMappings.find((x) => Number(x.RoleId || 0) === Number(roleId || 0))?.Id ?? 0,
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
      IsDeleted: false,
      EntityNo: this.userEntityNo
    };

    const formData = this.createUserFormData(payload);

    try {
      let response: any;

      if (!payload.Id) {
        response = await firstValueFrom(this.userMasterService.create(formData));
      } else {
        response = await firstValueFrom(this.userMasterService.update(formData));
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

  async editRow(row: any): Promise<void> {
    this.isEditMode = true;
      this.showAddDialog = true;

    this.dialogTitle = 'Edit User';
    this.dialogSubtitle = 'Update the selected user profile.';
    this.dialogPrimaryActionLabel = 'Update';

    try {
      if (this.userDetails.RoleId === 1) {
        await this.loadOrganizations();
      }

      const response: any = await firstValueFrom(this.userMasterService.getById(row.Id ?? 0));
      const user = response.result ?? {};

      this.dialogId = user.Id ?? 0;
      this.dialogOrganization = user.OrgId || null;
      this.dialogCode = user.Code ?? '';
      this.dialogName = user.Name ?? '';
      this.dialogRemarks = user.Remarks ?? '';
      this.dialogEmail = user.Email ?? '';
      this.dialogContactNumber = user.ContactNo ? String(user.ContactNo) : '';
      this.dialogEmpCode = user.EmpCode ?? '';
      this.dialogImage = this.normalizeImageValue(user.Image ?? '');
      this.dialogImageName = this.getImageFileName(this.dialogImage);
      this.dialogImageUrl = this.getImagePreviewUrl(this.dialogImage);
      this.dialogImageFile = null;
      this.dialogGender = user.Gender ? String(user.Gender) : null;
      this.dialogDateOfBirth = user.DOB ? new Date(user.DOB) : null;
      this.dialogAge = String(user.Age || '');
      this.dialogIsAdmin = user.IsAdmin === true ? 'Yes' : 'No';
      this.dialogAddress1 = user.Address1 ?? '';
      this.dialogAddress2 = user.Address2 ?? '';
      this.dialogPostalCode = user.PostalCode ?? '';

      await this.loadBranches(Number(this.dialogOrganization || this.userDetails.OrgId || 0));
      await this.loadRoles(Number(this.dialogOrganization || this.userDetails.OrgId || 0));

      const userBranchResponse: any = await firstValueFrom(this.userMasterService.getuserBranchesByUserId(row.Id ?? 0));
      const userRoleResponse: any = await firstValueFrom(this.userMasterService.getuserRolesByUserId(row.Id ?? 0));

      this.dialogUserBranchMappings = userBranchResponse.result ?? [];
      this.dialogUserRoleMappings = userRoleResponse.result ?? [];
      this.dialogBranches = (userBranchResponse.result ?? []).map((branch: any) => Number(branch.BranchId || 0));
      this.dialogRoles = (userRoleResponse.result ?? []).map((role: any) => Number(role.RoleId || 0));
      this.changeDetector.detectChanges();

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

  async deleteRow(row: any): Promise<void> {
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

  async activateRow(row: any): Promise<void> {
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

  async deactivateRow(row: any): Promise<void> {
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

  printRow(row: any): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'User')} print will be connected later.`);
  }

  openRowActions(menu: any, event: MouseEvent, row: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.model = this.rowActionItems;
    this.changeDetector.detectChanges();
    menu.toggle(event);
  }

  confirmDeleteRow(row: any): void {
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

  confirmActivateRow(row: any): void {
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

  confirmDeactivateRow(row: any): void {
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

    if (!file) {
      this.dialogImageFile = null;
      this.dialogImageName = this.getImageFileName(this.dialogImage);
      return;
    }

    this.dialogImageName = file.name;
    this.dialogImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.dialogImageUrl = String(reader.result ?? '');
      this.changeDetector.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  getUserImage(row: any): string {
    if (row.ImageUrl) {
      return row.ImageUrl;
    }

    const initials = encodeURIComponent((row.Name || 'U').trim().charAt(0).toUpperCase());
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='24' fill='%23e2e8f0'/><circle cx='60' cy='44' r='20' fill='%2394a3b8'/><path d='M24 102c6-18 20-28 36-28s30 10 36 28' fill='%2394a3b8'/><text x='60' y='112' text-anchor='middle' font-size='18' font-family='Arial' fill='%23475569'>${initials}</text></svg>`;
  
  }

  private getGenderName(gender: string | null): string {
    return this.genderOptions.find((x) => x.value === gender)?.label ?? '';
  }

  private applyCardSearch(): void {
    const searchText = this.cardSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) => {
      return String(row.Name ?? '').toLowerCase().includes(searchText)
        || String(row.Email ?? '').toLowerCase().includes(searchText)
        || String(row.ContactNumber ?? '').toLowerCase().includes(searchText)
        || String(row.EmpCode ?? row.Code ?? '').toLowerCase().includes(searchText);
    });
  }

  private normalizeImageValue(image: string): string {
    if (!image) {
      return '';
    }

    if (image.startsWith('data:')) {
      return image;
    }

    const marker = '/FileUpload/';
    const markerIndex = image.indexOf(marker);

    if (markerIndex >= 0) {
      return this.normalizeImageValue(image.substring(markerIndex + marker.length));
    }

    const normalizedImage = image.replace(/^\/+/, '');

    if (normalizedImage.startsWith('FileUpload/')) {
      return this.normalizeImageValue(normalizedImage.substring('FileUpload/'.length));
    }

    if (normalizedImage.startsWith('User/')) {
      return this.getImageFileName(normalizedImage);
    }

    if (normalizedImage.includes('/')) {
      return this.getImageFileName(normalizedImage);
    }

    return normalizedImage;
  }

  private getImagePreviewUrl(image: string): string {
    if (!image) {
      return '';
    }

    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
      return image;
    }

    const normalizedImage = this.normalizeImageValue(image);

    if (!normalizedImage) {
      return '';
    }

    if (normalizedImage.startsWith('User/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    if (normalizedImage.includes('/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    return `${this.runtimeConfig.apiBaseUrl}/FileUpload/User/${normalizedImage}`;
  }

  private getImageFileName(image: string): string {
    if (!image) {
      return '';
    }

    const parts = image.split(/[\\/]/);
    return parts[parts.length - 1] ?? '';
  }

  private async loadLatestUserCode(orgId: number): Promise<void> {
    if (!this.userEntityNo || !orgId) {
      this.dialogCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.userEntityNo, orgId, 0));
      this.dialogCode = response?.result ?? '';
    } catch {
      this.dialogCode = '';
      this.toast.error('Load Failed', 'Unable to load user code. Please check and try again.');
    }
  }

  private createUserFormData(payload: UserMaster): FormData {
    const formData = new FormData();

    formData.append('Id', String(payload.Id ?? 0));
    formData.append('Code', payload.Code ?? '');
    formData.append('Name', payload.Name ?? '');
    formData.append('Remarks', payload.Remarks ?? '');
    formData.append('IsAdmin', String(payload.IsAdmin ?? false));
    formData.append('Email', payload.Email ?? '');
    formData.append('Password', payload.Password ?? '');
    formData.append('ContactNo', payload.ContactNo ?? '');
    formData.append('EmpCode', payload.EmpCode ?? '');
    formData.append('OrgId', String(payload.OrgId ?? 0));
    formData.append('Image', payload.Image ?? '');
    formData.append('Gender', String(payload.Gender ?? 0));
    formData.append('DOB', payload.DOB ?? '');
    formData.append('Age', String(payload.Age ?? 0));
    formData.append('Address1', payload.Address1 ?? '');
    formData.append('Address2', payload.Address2 ?? '');
    formData.append('City', String(payload.City ?? 0));
    formData.append('State', String(payload.State ?? 0));
    formData.append('Country', String(payload.Country ?? 0));
    formData.append('PostalCode', payload.PostalCode ?? '');
    formData.append('IsActive', String(payload.IsActive ?? true));
    formData.append('CreatedBy', String(payload.CreatedBy ?? 0));
    formData.append('CreatedDate', payload.CreatedDate ?? '');
    formData.append('UpdatedBy', String(payload.UpdatedBy ?? 0));
    formData.append('UpdatedDate', payload.UpdatedDate ?? '');
    formData.append('IsDeleted', String(payload.IsDeleted ?? false));
    formData.append('EntityNo', String(payload.EntityNo ?? 0));

    if (payload.ImageFile) {
      formData.append('ImageFile', payload.ImageFile, payload.ImageFile.name);
    }

    (payload.UserBranchMapping ?? []).forEach((branch, index) => {
      formData.append(`UserBranchMapping[${index}].Id`, String(branch.Id ?? 0));
      formData.append(`UserBranchMapping[${index}].UserId`, String(branch.UserId ?? 0));
      formData.append(`UserBranchMapping[${index}].BranchId`, String(branch.BranchId ?? 0));
      formData.append(`UserBranchMapping[${index}].IsActive`, String(branch.IsActive ?? true));
      formData.append(`UserBranchMapping[${index}].CreatedBy`, String(branch.CreatedBy ?? 0));
      formData.append(`UserBranchMapping[${index}].CreatedDate`, branch.CreatedDate ?? '');
      formData.append(`UserBranchMapping[${index}].UpdatedBy`, String(branch.UpdatedBy ?? 0));
      formData.append(`UserBranchMapping[${index}].UpdatedDate`, branch.UpdatedDate ?? '');
      formData.append(`UserBranchMapping[${index}].IsDeleted`, String(branch.IsDeleted ?? false));
    });

    (payload.UserRoleMapping ?? []).forEach((role, index) => {
      formData.append(`UserRoleMapping[${index}].Id`, String(role.Id ?? 0));
      formData.append(`UserRoleMapping[${index}].UserId`, String(role.UserId ?? 0));
      formData.append(`UserRoleMapping[${index}].RoleId`, String(role.RoleId ?? 0));
      formData.append(`UserRoleMapping[${index}].IsActive`, String(role.IsActive ?? true));
      formData.append(`UserRoleMapping[${index}].CreatedBy`, String(role.CreatedBy ?? 0));
      formData.append(`UserRoleMapping[${index}].CreatedDate`, role.CreatedDate ?? '');
      formData.append(`UserRoleMapping[${index}].UpdatedBy`, String(role.UpdatedBy ?? 0));
      formData.append(`UserRoleMapping[${index}].UpdatedDate`, role.UpdatedDate ?? '');
      formData.append(`UserRoleMapping[${index}].IsDeleted`, String(role.IsDeleted ?? false));
    });

    return formData;
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

  private getRowActionItems(row: any): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.userRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.userRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.userRights.ActiveInActive && row.IsActive === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.userRights.ActiveInActive && row.IsActive !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.userRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row) });
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

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;
    this.dialogOrganization = null;
    if (!keepCode) {
      this.dialogCode = '';
    }
    this.dialogName = '';
    this.dialogRemarks = '';
    this.dialogEmail = '';
    this.dialogContactNumber = '';
    this.dialogEmpCode = '';
    this.dialogImageName = '';
    this.dialogImage = '';
    this.dialogImageUrl = '';
    this.dialogImageFile = null;
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
    this.dialogUserBranchMappings = [];
    this.dialogUserRoleMappings = [];
  }
}
