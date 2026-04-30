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
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { CommonService } from '../../../services/common.service';
import { OrganizationService } from '../../../services/organization.service';

type BranchRow = Branch & {
  RowNumber: number;
  Status: string;
};

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];

const BRANCH_COLUMNS: SharedTableColumn<BranchRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'OrganizationName', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '20rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    MultiSelectFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  providers: [ConfirmationService],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly branchService = inject(BranchService);
  private readonly commonService = inject(CommonService);
  private readonly organizationService = inject(OrganizationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  filterOrganizations: MultiSelectFieldValue = [];

  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogOrganization: SelectFieldValue = null;
  dialogPhone = '';
  dialogEmail = '';
  dialogContactPerson = '';
  dialogContactMobileNo = '';
  dialogContactEmail = '';
  dialogAddress1 = '';
  dialogAddress2 = '';
  dialogCity: SelectFieldValue = null;
  dialogState: SelectFieldValue = null;
  dialogCountry: SelectFieldValue = null;
  dialogPostalCode = '';
  dialogRemarks = '';

  selectedRow: BranchRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: BranchRow[] = [];
  tableRows: BranchRow[] = [];
  userDetails: any = {};
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  organizationOptions: any[] = [];

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Branches';
  readonly pageSubtitle = 'Maintain restaurant branch details.';
  readonly filterTitle = 'Branch Filters';
  readonly primaryActionLabel = 'Search Branches';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Branch';
  dialogSubtitle = 'Create a new branch for the organization.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Branches';
  readonly tableCaption = 'Branches';
  tableColumns = BRANCH_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showFilterButton = false;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.showFilterButton = this.userDetails.RoleId === 1;

    this.tableColumns = BRANCH_COLUMNS.map((x: any) => {
      if (x.field === 'OrganizationName') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadBranches();
  }

  loadBranches(): void {
    const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);

    this.branchService.getAll(orgId).subscribe({
      next: (response) => {
        let RowNumber = 1;

        this.tableRows = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
          x.Status = x.IsActive ? 'Active' : 'Inactive';
          return x;
        });
        this.allRows = [...this.tableRows];

        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load branches. Please check API and try again.');
      }
    });
  }

  resetForm(): void {
    this.filterOrganizations = [];
    this.tableRows = [...this.allRows];
  }

  searchBranches(): void {
    if (!this.filterOrganizations.length) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      this.filterOrganizations.includes(Number(row.OrgId || 0))
    );
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

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Branch';
    this.dialogSubtitle = 'Create a new branch for the organization.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
    if (this.userDetails.RoleId === 1) {
      this.loadOrganizations();
    }
     this.loadCountries();
  }

  closeAddDialog(): void {
    this.loadBranches();
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

    this.dialogSaving = true;

    const payload: Branch = {
      Id: this.dialogId,
      Code: this.dialogCode,
      Name: this.dialogName,
      Phone: this.dialogPhone,
      Email: this.dialogEmail,
      ContactPerson: this.dialogContactPerson,
      ContactMobileNo: this.dialogContactMobileNo,
      ContactEmail: this.dialogContactEmail,
      Address1: this.dialogAddress1,
      Address2: this.dialogAddress2,
      City: Number(this.dialogCity || 0),
      State: Number(this.dialogState || 0),
      Country: Number(this.dialogCountry || 0),
      PostalCode: Number(this.dialogPostalCode || 0),
      Remarks: this.dialogRemarks,
      OrgId: this.userDetails.RoleId === 1
        ? Number(this.dialogOrganization || 0)
        : Number(this.userDetails.OrgId || 0),
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
        response = await firstValueFrom(this.branchService.create(payload));
      } else {
        response = await firstValueFrom(this.branchService.update(payload));
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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save branch.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save branch.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: BranchRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Branch';
    this.dialogSubtitle = 'Update the selected branch details.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.branchService.getById(row.Id ?? 0));
      const branch = response.result ?? {};

      this.dialogId = branch.Id ?? 0;
      this.dialogOrganization = branch.OrgId ?? null;
      this.dialogCode = branch.Code ?? '';
      this.dialogName = branch.Name ?? '';
      this.dialogPhone = branch.Phone ?? '';
      this.dialogEmail = branch.Email ?? '';
      this.dialogContactPerson = branch.ContactPerson ?? '';
      this.dialogContactMobileNo = branch.ContactMobileNo ?? '';
      this.dialogContactEmail = branch.ContactEmail ?? '';
      this.dialogAddress1 = branch.Address1 ?? '';
      this.dialogAddress2 = branch.Address2 ?? '';
      this.dialogPostalCode = branch.PostalCode ? String(branch.PostalCode) : '';
      this.dialogRemarks = branch.Remarks ?? '';

      if (this.userDetails.RoleId === 1) {
        await this.loadOrganizations();
      }

      await this.loadCountries();
      this.dialogCountry = branch.Country ?? null;

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = branch.State ?? null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = branch.City ?? null;
    } catch {
      this.toast.error('Load Failed', 'Unable to load branch details. Please check and try again.');
    }
  }

  async deleteRow(row: BranchRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.branchService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadBranches();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: BranchRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.branchService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadBranches();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: BranchRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.branchService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadBranches();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  openRowActions(menu: any, event: Event, row: BranchRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: BranchRow): void {
    const name = String(row.Name ?? row.Code ?? 'this branch');

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

  confirmActivateRow(row: BranchRow): void {
    const name = String(row.Name ?? row.Code ?? 'this branch');

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

  confirmDeactivateRow(row: BranchRow): void {
    const name = String(row.Name ?? row.Code ?? 'this branch');

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
    this.dialogOrganization = null;
    if (!keepCode) {
      this.dialogCode = '';
    }
    this.dialogName = '';
    this.dialogPhone = '';
    this.dialogEmail = '';
    this.dialogContactPerson = '';
    this.dialogContactMobileNo = '';
    this.dialogContactEmail = '';
    this.dialogAddress1 = '';
    this.dialogAddress2 = '';
    this.dialogCity = null;
    this.dialogState = null;
    this.dialogCountry = null;
    this.dialogPostalCode = '';
    this.dialogRemarks = '';
  }

  private getOrganizationName(orgId: number | string | undefined): string {
    const organization = this.organizationOptions.find((x: any) => Number(x.value || 0) === Number(orgId || 0));
    return organization?.label ?? '';
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: BranchRow): MenuItem[] {
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
}
