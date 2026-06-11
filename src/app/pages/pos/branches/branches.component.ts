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
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';


import { AppToastService } from '../../../services/app-toast.service';
import { AppLocaleService } from '../../../services/app-locale.service';


import { Branch, BranchService } from '../../../services/branch.service';
import { CommonService } from '../../../services/common.service';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { TableExportService } from '../../../services/table-export.service';
 

type BranchRow = Branch & {
  RowNumber: number;
  Status: string;
};

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];
const languageOptions: any[] = [];

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
    SharedTableCellTemplateDirective,
    ProgressSpinnerModule
  ],
  providers: [ConfirmationService],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly appLocale = inject(AppLocaleService);
  private readonly branchService = inject(BranchService);
  private readonly commonService = inject(CommonService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly organizationService = inject(OrganizationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  pageLoading = false;
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
  dialogLanguageCode: SelectFieldValue = null;
  dialogCurrencyDisplay = '';
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
  languageOptions = languageOptions;
  organizationOptions: any[] = [];
  branchEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  branchRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Branches';
  readonly pageSubtitle = 'Maintain restaurant branch details.';
  readonly pageLoadingTitle = 'Please wait';
  readonly pageLoadingSubtitle = 'Loading records...';
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
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showDownloadButton = true;
  showFilterButton = false;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';

  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.showFilterButton = this.userDetails.RoleId === 1;
    try {
      await this.loadBranchRights();

      this.tableColumns = BRANCH_COLUMNS.map((x: any) => {
        if (x.field === 'OrganizationName') {
          x.hidden = this.userDetails.RoleId !== 1;
        }

        return x;
      });

      this.loadBranches();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadBranchRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.branchEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? response?.result?.[0] ?? {};

      this.branchRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.branchRights.Create;
      this.showDownloadButton = this.branchRights.Download;
      this.showRowActions = this.branchRights.Edit || this.branchRights.Delete || this.branchRights.ActiveInActive || this.branchRights.Print;
    } catch {
      this.branchRights = {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        ActiveInActive: false,
        Print: false,
        Download: false
      };
      this.showAddNewButton = false;
      this.showDownloadButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load branch role rights. Please check and try again.');
    }
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

        this.pageLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.pageLoading = false;
        this.toast.error('Load Failed', 'Unable to load branches. Please check API and try again.');
        this.changeDetector.detectChanges();
      }
    });
  }

  async exportBranchesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Branches`;

      if (this.filterOrganizations.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterOrganizations.includes(Number(row.OrgId || 0))
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No branches are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Branches');
      this.toast.success('Export Ready', 'Branch Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export branches to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportBranchesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Branches`;

      if (this.filterOrganizations.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterOrganizations.includes(Number(row.OrgId || 0))
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No branches are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Branches', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Branch PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export branches to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
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

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Branch';
    this.dialogSubtitle = 'Create a new branch for the organization.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.userDetails.RoleId === 1) {
      await this.loadOrganizations();
    } else {
      await this.loadLatestBranchCode(Number(this.userDetails.OrgId || 0));
    }

    await this.loadLanguages();
    await this.loadCountries();
    this.dialogLanguageCode = null;
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
        value: country.Id ?? 0,
        Currency: country.Currency ?? '',
        CurrencyName: country.CurrencyName ?? '',
        CurrencySymbol: country.CurrencySymbol ?? ''
      }));
      this.changeDetector.detectChanges();
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

  async loadLanguages(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.commonService.GetLanguage());
      const languages = response?.result ?? [];
      this.languageOptions = languages.map((language: any) => ({
        label: language.NativeName
          ? `${language.Name ?? language.Code} (${language.NativeName})`
          : (language.Name ?? language.Code ?? ''),
        value: language.Code ?? ''
      }));
      this.changeDetector.detectChanges();
    } catch {
      this.languageOptions = [];
      this.toast.error('Load Failed', 'Unable to load languages. Please check and try again.');
    }
  }

  async onDialogOrganizationChange(value: SelectFieldValue): Promise<void> {
    this.dialogOrganization = value;

    if (this.isEditMode) {
      return;
    }

    if (!value || Number(value) === 0) {
      this.dialogCode = '';
      return;
    }

    await this.loadLatestBranchCode(Number(value));
  }

  onCountryChange(value: SelectFieldValue): void {
    this.dialogCountry = value;
    const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(value || 0));
    this.dialogCurrencyDisplay = selectedCountry
      ? [selectedCountry.Currency, selectedCountry.CurrencyName, selectedCountry.CurrencySymbol].filter(Boolean).join(' - ')
      : [this.userDetails?.OrgCurrencyCode, this.userDetails?.OrgCurrencyName, this.userDetails?.OrgCurrencySymbol].filter(Boolean).join(' - ');
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
        value: state.Id ?? 0,
        Timezone: state.Timezone ?? ''
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

    this.loadCities(Number(value));
  }

  async loadCities(stateId: number): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.commonService.GetCityByStateId(stateId));
      const cities = response?.result ?? [];

      this.cityOptions = cities.map((city: any) => ({
        label: city.Name ?? '',
        value: city.Id ?? 0,
        Timezone: city.Timezone ?? ''
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
      LanguageCode: String(this.dialogLanguageCode || '').trim() || undefined,
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
      IsDeleted: false,
      EntityNo: this.branchEntityNo
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
        this.syncCurrentBranchLocale(Number(response.result || 0), payload.LanguageCode);
        this.toast.success('Saved', `${payload.Name || this.pageTitle} saved successfully.`);
        this.closeAddDialog();
        return;
      }

      if (response.ErrorInfo.Message === true && payload.Id) {
        this.syncCurrentBranchLocale(Number(payload.Id || response.result || 0), payload.LanguageCode);
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
      this.dialogLanguageCode = String(branch.LanguageCode ?? '').trim() || null;

      if (this.userDetails.RoleId === 1) {
        await this.loadOrganizations();
      }

      await this.loadLanguages();
      await this.loadCountries();
      this.dialogCountry = branch.Country ?? null;
      const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(this.dialogCountry || 0));
      this.dialogCurrencyDisplay = selectedCountry
        ? [selectedCountry.Currency, selectedCountry.CurrencyName, selectedCountry.CurrencySymbol].filter(Boolean).join(' - ')
        : [this.userDetails?.OrgCurrencyCode, this.userDetails?.OrgCurrencyName, this.userDetails?.OrgCurrencySymbol].filter(Boolean).join(' - ');

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = branch.State ?? null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = branch.City ?? null;
      this.changeDetector.detectChanges();
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

  printRow(row: BranchRow): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Branch')} print will be connected later.`);
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
    this.dialogLanguageCode = null;
    this.dialogCurrencyDisplay = '';
    this.dialogPostalCode = '';
    this.dialogRemarks = '';
  }

  private getOrganizationName(orgId: number | string | undefined): string {
    const organization = this.organizationOptions.find((x: any) => Number(x.value || 0) === Number(orgId || 0));
    return organization?.label ?? '';
  }

  private async loadLatestBranchCode(orgId: number): Promise<void> {
    if (!this.branchEntityNo || !orgId) {
      this.dialogCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.branchEntityNo, orgId, 0));
      console.log('Latest Terminal Code Response:', response.result);
      this.dialogCode = response?.result ?? '';
    } catch {
      this.dialogCode = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: BranchRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.branchRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.branchRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.branchRights.ActiveInActive && row.IsActive === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.branchRights.ActiveInActive && row.IsActive !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.branchRights.Print) {
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

  private syncCurrentBranchLocale(savedBranchId: number, languageCode?: string): void {
    const currentBranchId = Number(this.userDetails?.BranchId || 0);
    if (!savedBranchId || savedBranchId !== currentBranchId) {
      return;
    }

    const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(this.dialogCountry || 0));
    const selectedState = this.stateOptions.find((state: any) => Number(state.value || 0) === Number(this.dialogState || 0));
    const selectedCity = this.cityOptions.find((city: any) => Number(city.value || 0) === Number(this.dialogCity || 0));
    const timezone = selectedCity?.Timezone || selectedState?.Timezone || this.userDetails?.BranchTimezone || '';

    const updatedUserDetails = {
      ...this.userDetails,
      BranchLanguageCode: String(languageCode ?? '').trim(),
      BranchCurrencyCode: selectedCountry?.Currency ?? '',
      BranchCurrencyName: selectedCountry?.CurrencyName ?? '',
      BranchCurrencySymbol: selectedCountry?.CurrencySymbol ?? '',
      BranchTimezone: selectedCountry ? timezone : '',
      LanguageCode: String(
        String(languageCode ?? '').trim()
        || this.userDetails?.OrgLanguageCode
        || ''
      ).trim()
    };

    this.userDetails = updatedUserDetails;
    localStorage.setItem('userDetails', JSON.stringify(updatedUserDetails));
    this.appLocale.syncFromUserDetails(updatedUserDetails);
  }
}
