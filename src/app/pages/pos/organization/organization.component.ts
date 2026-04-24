import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { CommonService } from '../../../services/common.service';
import { Organization, OrganizationService } from '../../../services/organization.service';

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];

const ORGANIZATION_COLUMNS: SharedTableColumn<Organization>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '20rem' },
  { field: 'Website', header: 'Website', sortable: true, width: '22rem' },
  {
    field: 'Status',
    header: 'Status',
    sortable: true,
    width: '8rem'
  }
];


@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent, SharedTableCellTemplateDirective],
  providers: [ConfirmationService],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.css'
})
export class OrganizationComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly organizationService = inject(OrganizationService);
  private readonly commonService = inject(CommonService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  showAddDialog = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  showFilterSidebar = false;
  filterCompanyName = '';

  dialogId = 0;
  dialogCode = '';
  dialogCompanyName = '';
  dialogGstNumber = '';
  dialogRegistrationNumber = '';
  dialogPhoneNumber = '';
  dialogEmail = '';
  dialogWebsite = '';
  dialogContactPerson = '';
  dialogContactPersonPhone = '';
  dialogContactPersonEmail = '';
  dialogAddressLine1 = '';
  dialogAddressLine2 = '';
  dialogCity: SelectFieldValue = null;
  dialogState: SelectFieldValue = null;
  dialogCountry: SelectFieldValue = null;
  dialogPostalCode = '';
  dialogRemarks = '';
  showConfigDialog = false;
  configOrganizationName = '';
  configImageName = '';
  configThemeColor = '#2f7d57';
  configFontSize = '14';

  selectedRow: Record<string, unknown> | null = null;
  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Organization';
  readonly pageSubtitle = 'Maintain restaurant organization identity details.';
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  readonly filterTitle = 'Organization Filters';
  readonly primaryActionLabel = 'Search Organization';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Organization';
  dialogSubtitle = 'Create a new restaurant organization profile.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Organization';
  readonly tableCaption = 'Organization';
  readonly tableColumns = ORGANIZATION_COLUMNS;
  tableRows: Organization[] = [];
  userDetails: any = {};

  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  rowActionItems: MenuItem[] = [];

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadOrganizations();
  }

  resetForm(): void {
    this.filterCompanyName = '';
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
    this.dialogTitle = 'Create Organization';
    this.dialogSubtitle = 'Create a new restaurant organization profile.';
    this.dialogPrimaryActionLabel = 'Save';

    this.showAddDialog = true;

    void this.loadCountries();
  }

  closeAddDialog(): void {
    this.loadOrganizations();
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

    this.dialogSaving = true;

    const payload: Organization = {
      Id: this.dialogId,
      Code: this.dialogCode,
      Name: this.dialogCompanyName,
      GSTNo: this.dialogGstNumber,
      RegistrationNo: this.dialogRegistrationNumber,
      Phone: this.dialogPhoneNumber,
      Email: this.dialogEmail,
      Website: this.dialogWebsite,
      ContactPerson: this.dialogContactPerson,
      ContactMobileNo: this.dialogContactPersonPhone,
      ContactEmail: this.dialogContactPersonEmail,
      Address1: this.dialogAddressLine1,
      Address2: this.dialogAddressLine2,
      City: Number(this.dialogCity || 0),
      State: Number(this.dialogState || 0),
      Country: Number(this.dialogCountry || 0),
      PostalCode: Number(this.dialogPostalCode || 0),
      Remarks: this.dialogRemarks,
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
       response = await firstValueFrom(this.organizationService.create(payload));
      } else {
         response = await firstValueFrom(this.organizationService.update(payload));
      }

      if (response.ErrorInfo.Message == true && !payload.Id) {
        this.toast.success('Saved', `${payload.Name || this.pageTitle} saved successfully.`);
        this.closeAddDialog();
        return;
      }
        else if (response.ErrorInfo.Message == true && payload.Id) {
        this.toast.success('Updated', `${payload.Name || this.pageTitle} updated successfully.`);
        this.closeAddDialog();
        return;
      }
      else {
        this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save organization.');
      }

    } catch {
      this.toast.error(payload.Id ? 'Update Failed' :'Save Failed', 'Unable to save organization.');
    } finally {
      this.dialogSaving = false;
    }
  }

  loadOrganizations(): void{
    this.organizationService.getAll().subscribe({
      next: (response) => {
        let RowNumber = 1;
        this.tableRows = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.Status = x.IsActive ? 'Active' : 'Inactive';
          return x;
        });
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
      }
    });
  }

  getWebsiteUrl(website: string): string {
    if (website.startsWith('http://') || website.startsWith('https://')) {
      return website;
    }

    return `https://${website}`;
  }

  async editRow(row:any): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Organization';
    this.dialogSubtitle = 'Update the selected restaurant organization profile.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.organizationService.getById(row['Id']));
      const organization = response.result ?? {};

      this.dialogId = organization.Id ?? 0;
      this.dialogCode = organization.Code ?? '';
      this.dialogCompanyName = organization.Name ?? '';
      this.dialogGstNumber = organization.GSTNo ?? '';
      this.dialogRegistrationNumber = organization.RegistrationNo ?? '';
      this.dialogPhoneNumber = organization.Phone ?? '';
      this.dialogEmail = organization.Email ?? '';
      this.dialogWebsite = organization.Website ?? '';
      this.dialogContactPerson = organization.ContactPerson ?? '';
      this.dialogContactPersonPhone = organization.ContactMobileNo ?? '';
      this.dialogContactPersonEmail = organization.ContactEmail ?? '';
      this.dialogAddressLine1 = organization.Address1 ?? '';
      this.dialogAddressLine2 = organization.Address2 ?? '';
      this.dialogPostalCode = organization.PostalCode ? String(organization.PostalCode) : '';
      this.dialogRemarks = organization.Remarks ?? '';

      await this.loadCountries();
      this.dialogCountry = organization.Country ?? null;

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = organization.State ?? null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = organization.City ?? null;
    } catch {
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  openConfigDialog(row: Record<string, unknown>): void {
    this.resetConfigForm();
    this.configOrganizationName = String(row['name'] ?? row['companyName'] ?? row['code'] ?? this.pageTitle);
    this.showConfigDialog = true;
  }

  closeConfigDialog(): void {
    this.showConfigDialog = false;
  }

  submitConfigDialog(): void {
    this.toast.success('Config Saved', `${this.configOrganizationName || this.pageTitle} configuration saved successfully.`);
    this.closeConfigDialog();
  }

  onConfigImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.configImageName = input.files?.[0]?.name ?? '';
  }

  async deleteRow(row:any): Promise<void> {
    try {
     let response: any = await firstValueFrom(this.organizationService.delete(row['Id']));
    
     if (response.ErrorInfo.Message == true) {
     this.toast.success('Deleted', `${String(row['name'] ?? row['code'] ?? 'Record')} deleted successfully.`);
      this.loadOrganizations();
     }
      else {
      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
     }

    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
    } 
  }

  async activateRow(row:any): Promise<void> {
    try {
     let response: any = await firstValueFrom(this.organizationService.activeInActive(row['Id'], true));
    
     if (response.ErrorInfo.Message == true) {
     this.toast.success('Activated', `${String(row['name'] ?? row['code'] ?? 'Record')} activated successfully.`);
      this.loadOrganizations();
     }
      else {
      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
     }

    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
    } 
  }

  async deactivateRow(row:any): Promise<void> {
    try {
     let response: any = await firstValueFrom(this.organizationService.activeInActive(row['Id'], false));
    
     if (response.ErrorInfo.Message == true) {
     this.toast.success('Deactivated', `${String(row['name'] ?? row['code'] ?? 'Record')} deactivated successfully.`);
      this.loadOrganizations();
     }
      else {
      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
     }

    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row['name'] ?? row['code'] ?? 'record')}. Please try again.`);
    } 
  }

  openRowActions(menu: any, event: Event, row: Record<string, unknown>): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: Record<string, unknown>): void {
    const name = String(row['Name'] ?? row['Code'] ?? 'this organization');

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

  confirmActivateRow(row: Record<string, unknown>): void {
    const name = String(row['Name'] ?? row['Code'] ?? 'this organization');

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

  confirmDeactivateRow(row: Record<string, unknown>): void {
    const name = String(row['Name'] ?? row['Code'] ?? 'this organization');

    this.confirmationService.confirm({
      header: 'Inactive Confirmation',
      message: `Are you sure you want to inactive ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

   resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    // this.dialogCode = '';
    this.dialogCompanyName = '';
    this.dialogGstNumber = '';
    this.dialogRegistrationNumber = '';
    this.dialogPhoneNumber = '';
    this.dialogEmail = '';
    this.dialogWebsite = '';
    this.dialogContactPerson = '';
    this.dialogContactPersonPhone = '';
    this.dialogContactPersonEmail = '';
    this.dialogAddressLine1 = '';
    this.dialogAddressLine2 = '';
    this.dialogCity = null;
    this.dialogState = null;
    this.dialogCountry = null;
    this.dialogPostalCode = '';
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private resetConfigForm(): void {
    this.configImageName = '';
    this.configThemeColor = '#2f7d57';
    this.configFontSize = '14';
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row['IsActive'] === true) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    items.push({ label: 'Add Config', icon: 'pi pi-cog', styleClass: 'row-action-config', command: () => this.handleRowAction('config') });

    return items;
  }

  private handleRowAction(action: 'config' | 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'config') {
      this.openConfigDialog(this.selectedRow);
    } else if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }
}













