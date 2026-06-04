import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { CommonService } from '../../../services/common.service';
import { Customer, CustomerService } from '../../../services/customer.service';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { TableExportService } from '../../../services/table-export.service';
type CustomerRow = Customer & {
  RowNumber: number;
  Status: string;
  GenderLabel?: string;
};

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];
const memberOptions = [
  { label: 'Yes', value: 1 },
  { label: 'No', value: 0 }
];
const genderOptions = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' }
];

const CUSTOMER_COLUMNS: SharedTableColumn<CustomerRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'MobileNo', header: 'Mobile', sortable: true, width: '12rem' },
  { field: 'EmailId', header: 'Email', sortable: true, width: '18rem' },
  { field: 'OpeningBalance', header: 'OpeningBalance', sortable: true, width: '18rem' },
  { field: 'IsMember', header: 'Membership', sortable: true, width: '18rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    ProgressSpinnerModule
  ],
  providers: [ConfirmationService],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit {
  
  
  private readonly toast = inject(AppToastService);
  
  
 private readonly customerService = inject(CustomerService);
  private readonly commonService = inject(CommonService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizationService = inject(OrganizationService);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  pageLoading = false;
  dialogSubmitted = false;
  dialogSaving = false;
  isLoading = false;

  filterCustomerName = '';
  selectedRow: CustomerRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: CustomerRow[] = [];
  allRows: CustomerRow[] = [];
  userDetails: any = {};
 OrgId = 0;
  BranchId = 0;
  dialogId = 0;
  dialogCode = '';
  dialogCustomerName = '';
  dialogMobileNo = '';
  dialogEmailId = '';
  dialogAddressLine1 = '';
  dialogCountry: SelectFieldValue = null;
  dialogState: SelectFieldValue = null;
  dialogCity: SelectFieldValue = null;
  dialogPincode = '';
  dialogDateOfBirth = '';
  dialogGender: SelectFieldValue = null;
  dialogMemberNo = '';
  dialogOpeningBalance = '';
  dialogIsMember: SelectFieldValue = null;
  dialogRemarks = '';

  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  readonly genderOptions = genderOptions;
  readonly memberOptions = memberOptions;

  readonly pageEyebrow = 'Customers';
  readonly pageTitle = 'Customer List';
  readonly pageSubtitle = 'Manage customer master details.';
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading customers workspace.';
  readonly filterTitle = 'Customer Filters';
  readonly primaryActionLabel = 'Search Customers';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Customer';
  dialogSubtitle = 'Capture new customer profiles.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Customer List';
  readonly tableCaption = 'Customer List';
  readonly tableColumns = CUSTOMER_COLUMNS;
  customerRights = { View: true, Create: true, Edit: true, Delete: true, ActiveInActive: true, Print: true, Download: true };
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  branchEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';
  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    try {
      await this.loadCustomerRights();
      this.OrgId = Number(this.userDetails.OrgId || 0);
      this.BranchId = Number(this.userDetails.BranchId || 0);
      this.loadCustomers();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadCustomerRights(): Promise<void> {
    const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
    const roleId = Number(this.userDetails?.RoleId || 0);
    const entityNo = Number(this.branchEntityNo || 0);

    if (!orgId || !roleId || !entityNo) {
      return;
    }

    try {
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0];

      if (rights) {
        this.customerRights = {
          View: rights.View === true,
          Create: rights.Create === true,
          Edit: rights.Edit === true,
          Delete: rights.Delete === true,
          ActiveInActive: rights.ActiveInActive === true,
          Print: rights.Print === true,
          Download: rights.Download === true
        };
      }

      this.showAddNewButton = this.customerRights.Create;
      this.showDownloadButton = this.customerRights.Download;
      this.showRowActions = this.customerRights.Edit || this.customerRights.Delete || this.customerRights.ActiveInActive || this.customerRights.Print;
    } catch {
      this.customerRights = { View: true, Create: false, Edit: false, Delete: false, ActiveInActive: false, Print: false, Download: false };
      this.showAddNewButton = false;
      this.showDownloadButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load customer rights for this role.');
    }
  }
private async loadLatestTableCode(orgId: number): Promise<void> {
    if (!this.branchEntityNo || !orgId) {
      this.dialogCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.branchEntityNo, orgId, this.BranchId));
      
      this.dialogCode = response?.result ?? '';
    } catch {
      this.dialogCode = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }

  loadCustomers(): void {
    this.isLoading = true;

    const orgId = Number(this.userDetails?.OrgId || 0);

    this.customerService.getAll(orgId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;
        this.allRows = (response.result ?? []).map((customer: any) => {
          customer.Id = customer.Id ?? customer.id ?? 0;
          customer.Code = customer.Code ?? customer.code ?? '';
          customer.Name = customer.Name ?? customer.name ?? '';
          customer.MobileNo = customer.MobileNo ?? customer.mobileNo ?? '';
          customer.EmailId = customer.EmailId ?? customer.emailId ?? '';
          customer.AddressLine1 = customer.AddressLine1 ?? customer.addressLine1 ?? '';
          customer.CityId = customer.CityId ?? customer.cityId ?? null;
          customer.StateId = customer.StateId ?? customer.stateId ?? null;
          customer.CountryId = customer.CountryId ?? customer.countryId ?? null;
          customer.Pincode = customer.Pincode ?? customer.pincode ?? '';
          customer.DateOfBirth = customer.DateOfBirth ?? customer.dateOfBirth ?? null;
          customer.Gender = customer.Gender ?? customer.gender ?? '';
          customer.MemberNo = customer.MemberNo ?? customer.memberNo ?? '';
          customer.OpeningBalance = customer.OpeningBalance ?? customer.openingBalance ?? 0;
          customer.IsMember = customer.IsMember ?? customer.isMember ?? false;
          customer.Remarks = customer.Remarks ?? customer.remarks ?? '';
          customer.OrgId = customer.OrgId ?? customer.orgId ?? 0;
          customer.IsActive = customer.IsActive ?? customer.isActive ?? false;
          customer.RowNumber = rowNumber++;
          customer.Status = customer.IsActive ? 'Active' : 'Inactive';
          customer.GenderLabel = customer.Gender;
          return customer;
        });

        this.tableRows = [...this.allRows];
        this.pageLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.pageLoading = false;
        this.changeDetector.detectChanges();
        this.toast.error('Load Failed', 'Unable to load customers. Please check API and try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async exportCustomersAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.customerService.getAll(orgId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((customer: any) => {
        customer.Id = customer.Id ?? customer.id ?? 0;
        customer.Code = customer.Code ?? customer.code ?? '';
        customer.Name = customer.Name ?? customer.name ?? '';
        customer.MobileNo = customer.MobileNo ?? customer.mobileNo ?? '';
        customer.EmailId = customer.EmailId ?? customer.emailId ?? '';
        customer.AddressLine1 = customer.AddressLine1 ?? customer.addressLine1 ?? '';
        customer.CityId = customer.CityId ?? customer.cityId ?? null;
        customer.StateId = customer.StateId ?? customer.stateId ?? null;
        customer.CountryId = customer.CountryId ?? customer.countryId ?? null;
        customer.Pincode = customer.Pincode ?? customer.pincode ?? '';
        customer.DateOfBirth = customer.DateOfBirth ?? customer.dateOfBirth ?? null;
        customer.Gender = customer.Gender ?? customer.gender ?? '';
        customer.MemberNo = customer.MemberNo ?? customer.memberNo ?? '';
        customer.OpeningBalance = customer.OpeningBalance ?? customer.openingBalance ?? 0;
        customer.IsMember = customer.IsMember ?? customer.isMember ?? false;
        customer.Remarks = customer.Remarks ?? customer.remarks ?? '';
        customer.OrgId = customer.OrgId ?? customer.orgId ?? 0;
        customer.IsActive = customer.IsActive ?? customer.isActive ?? false;
        customer.RowNumber = rowNumber++;
        customer.Status = customer.IsActive ? 'Active' : 'Inactive';
        customer.GenderLabel = customer.Gender;
        return customer;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Customers`;
      const searchText = this.filterCustomerName.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          String(row.Name ?? '').toLowerCase().includes(searchText) ||
          String(row.Code ?? '').toLowerCase().includes(searchText) ||
          String(row.MobileNo ?? '').toLowerCase().includes(searchText) ||
          String(row.EmailId ?? '').toLowerCase().includes(searchText) ||
          String(row.MemberNo ?? '').toLowerCase().includes(searchText) ||
          String(row.Status ?? '').toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No customers are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Customers');
      this.toast.success('Export Ready', 'Customer Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export customers to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportCustomersAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.customerService.getAll(orgId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((customer: any) => {
        customer.Id = customer.Id ?? customer.id ?? 0;
        customer.Code = customer.Code ?? customer.code ?? '';
        customer.Name = customer.Name ?? customer.name ?? '';
        customer.MobileNo = customer.MobileNo ?? customer.mobileNo ?? '';
        customer.EmailId = customer.EmailId ?? customer.emailId ?? '';
        customer.AddressLine1 = customer.AddressLine1 ?? customer.addressLine1 ?? '';
        customer.CityId = customer.CityId ?? customer.cityId ?? null;
        customer.StateId = customer.StateId ?? customer.stateId ?? null;
        customer.CountryId = customer.CountryId ?? customer.countryId ?? null;
        customer.Pincode = customer.Pincode ?? customer.pincode ?? '';
        customer.DateOfBirth = customer.DateOfBirth ?? customer.dateOfBirth ?? null;
        customer.Gender = customer.Gender ?? customer.gender ?? '';
        customer.MemberNo = customer.MemberNo ?? customer.memberNo ?? '';
        customer.OpeningBalance = customer.OpeningBalance ?? customer.openingBalance ?? 0;
        customer.IsMember = customer.IsMember ?? customer.isMember ?? false;
        customer.Remarks = customer.Remarks ?? customer.remarks ?? '';
        customer.OrgId = customer.OrgId ?? customer.orgId ?? 0;
        customer.IsActive = customer.IsActive ?? customer.isActive ?? false;
        customer.RowNumber = rowNumber++;
        customer.Status = customer.IsActive ? 'Active' : 'Inactive';
        customer.GenderLabel = customer.Gender;
        return customer;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Customers`;
      const searchText = this.filterCustomerName.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          String(row.Name ?? '').toLowerCase().includes(searchText) ||
          String(row.Code ?? '').toLowerCase().includes(searchText) ||
          String(row.MobileNo ?? '').toLowerCase().includes(searchText) ||
          String(row.EmailId ?? '').toLowerCase().includes(searchText) ||
          String(row.MemberNo ?? '').toLowerCase().includes(searchText) ||
          String(row.Status ?? '').toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No customers are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Customers', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Customer PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export customers to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  resetForm(): void {
    this.filterCustomerName = '';
    this.applyCustomerFilters();
    this.closeFilterSidebar();
  }

  searchCustomers(): void {
    this.applyCustomerFilters();
    this.closeFilterSidebar();
  }

  onFilterCustomerNameChange(value: string): void {
    this.filterCustomerName = value;
  }

  onMemberChange(value: SelectFieldValue): void {
    this.dialogIsMember = Number(value || 0);

    if (this.dialogIsMember !== 1) {
      this.dialogMemberNo = '';
    }
  }
  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Customer';
    this.dialogSubtitle = 'Capture new customer profiles.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

   this.loadLatestTableCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
    void this.loadCountries();
  }

  closeAddDialog(): void {
    this.loadCustomers();
    this.isEditMode = false;
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
      this.changeDetector.detectChanges();
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
      this.changeDetector.detectChanges();
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
      this.changeDetector.detectChanges();
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

    this.dialogSaving = true;

    const payload: Customer = {
      Id: this.dialogId,
      Code: this.dialogCode.trim(),
      Name: this.dialogCustomerName.trim(),
      MobileNo: this.dialogMobileNo.trim(),
      EmailId: this.dialogEmailId.trim(),
      AddressLine1: this.dialogAddressLine1.trim(),
      CountryId: Number(this.dialogCountry || 0) || null,
      StateId: Number(this.dialogState || 0) || null,
      CityId: Number(this.dialogCity || 0) || null,
      Pincode: this.dialogPincode.trim(),
      DateOfBirth: this.dialogDateOfBirth || null,
      Gender: String(this.dialogGender || ''),
      MemberNo: Number(this.dialogIsMember || 0) === 1 ? this.dialogMemberNo.trim() : '',
      OpeningBalance: Number(this.dialogOpeningBalance || 0),
      IsMember: Number(this.dialogIsMember || 0) === 1,
      Remarks: this.dialogRemarks.trim(),
      OrgId: Number(this.userDetails?.OrgId || 0),
      IsActive: true,
      CreatedBy: Number(this.userDetails?.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails?.UserId || 0),
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      let response: any;

      if (!payload.Id) {
        response = await firstValueFrom(this.customerService.create(payload));
      } else {
        response = await firstValueFrom(this.customerService.update(payload));
      }

      if (response.ErrorInfo.Message === true && response.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogCustomerName = '';
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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save customer.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save customer.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: CustomerRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Customer';
    this.dialogSubtitle = 'Update the selected customer profile.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.customerService.getById(row.Id ?? 0));
      const result = response.result ?? {};
      const customer = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = customer.Id ?? customer.id ?? 0;
      this.dialogCode = customer.Code ?? customer.code ?? '';
      this.dialogCustomerName = customer.Name ?? customer.name ?? '';
      this.dialogMobileNo = customer.MobileNo ?? customer.mobileNo ?? '';
      this.dialogEmailId = customer.EmailId ?? customer.emailId ?? '';
      this.dialogAddressLine1 = customer.AddressLine1 ?? customer.addressLine1 ?? '';
      this.dialogPincode = customer.Pincode ?? customer.pincode ?? '';
      const dateOfBirth = customer.DateOfBirth ?? customer.dateOfBirth ?? null;
      this.dialogDateOfBirth = dateOfBirth ? String(dateOfBirth).split('T')[0] : '';
      this.dialogGender = customer.Gender ?? customer.gender ?? null;
      this.dialogMemberNo = customer.MemberNo ?? customer.memberNo ?? '';
      const openingBalance = customer.OpeningBalance ?? customer.openingBalance;
      this.dialogOpeningBalance = openingBalance != null ? String(openingBalance) : '';
      this.dialogIsMember = (customer.IsMember ?? customer.isMember) ? 1 : 0;
      this.dialogRemarks = customer.Remarks ?? customer.remarks ?? '';

      await this.loadCountries();
      this.dialogCountry = customer.CountryId ?? customer.countryId ?? null;

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = customer.StateId ?? customer.stateId ?? null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = customer.CityId ?? customer.cityId ?? null;
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load customers. Please check and try again.');
    }
  }

  async deleteRow(row: CustomerRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.customerService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadCustomers();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: CustomerRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.customerService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadCustomers();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: CustomerRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.customerService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadCustomers();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  openRowActions(menu: any, event: Event, row: CustomerRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: CustomerRow): void {
    const name = String(row.Name ?? row.Code ?? 'this customer');

    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: CustomerRow): void {
    const name = String(row.Name ?? row.Code ?? 'this customer');

    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: `Are you sure you want to activate ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: CustomerRow): void {
    const name = String(row.Name ?? row.Code ?? 'this customer');

    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: `Are you sure you want to deactivate ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    if (!keepCode) {
      this.dialogCode = '';
    }
    this.dialogCustomerName = '';
    this.dialogMobileNo = '';
    this.dialogEmailId = '';
    this.dialogAddressLine1 = '';
    this.dialogCountry = null;
    this.dialogState = null;
    this.dialogCity = null;
    this.dialogPincode = '';
    this.dialogDateOfBirth = '';
    this.dialogGender = null;
    this.dialogMemberNo = '';
    this.dialogOpeningBalance = '';
    this.dialogIsMember = null;
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private applyCustomerFilters(): void {
    const searchText = this.filterCustomerName.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      this.changeDetector.detectChanges();
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      String(row.Name ?? '').toLowerCase().includes(searchText) ||
      String(row.Code ?? '').toLowerCase().includes(searchText) ||
      String(row.MobileNo ?? '').toLowerCase().includes(searchText) ||
      String(row.EmailId ?? '').toLowerCase().includes(searchText) ||
      String(row.MemberNo ?? '').toLowerCase().includes(searchText) ||
      String(row.Status ?? '').toLowerCase().includes(searchText)
    );

    this.changeDetector.detectChanges();
  }

  private getRowActionItems(row: CustomerRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.customerRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.customerRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.customerRights.ActiveInActive) {
      if (row.IsActive === true) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      } else {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }
    }

    if (this.customerRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
    }

    return items;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate' | 'print'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else if (action === 'print') {
      this.printRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }

  printRow(row: CustomerRow): void {
    const name = String(row.Name ?? row.Code ?? 'this customer');
    this.toast.info('Print Pending', `Print functionality for ${name} will be added soon.`);
  }
}

