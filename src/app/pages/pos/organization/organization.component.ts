import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';


import { AppToastService } from '../../../services/app-toast.service';


import { BranchService } from '../../../services/branch.service';
import { AppLocaleService } from '../../../services/app-locale.service';
import { CommonService } from '../../../services/common.service';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { Organization, OrganizationConfig, OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

const cityOptions: any[] = [];
const stateOptions: any[] = [];
const countryOptions: any[] = [];
const languageOptions: any[] = [];

const CODE_TEMPLATE_COLUMNS: SharedTableColumn<any>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '16rem' },
  { field: 'NoOfDigit', header: 'No Of Digit', sortable: true, width: '10rem' },
  { field: 'StartValue', header: 'Start Value', sortable: true, width: '10rem' },
  { field: 'Prefix', header: 'Prefix', sortable: true, width: '8rem' },
  { field: 'CurrentValue', header: 'Current Value', sortable: true, width: '11rem' },
  { field: 'Suffix', header: 'Suffix', sortable: true, width: '8rem' },
  {
    field: 'IsDateMonthYearWise',
    header: 'Is Year Type',
    sortable: true,
    width: '14rem'
  }
];

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogModule, ButtonModule, CardModule, DialogModule, ToggleSwitch, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent, SharedTableCellTemplateDirective],
  providers: [ConfirmationService],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.css'
})
export class OrganizationComponent implements OnInit {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly branchService = inject(BranchService);
  private readonly appLocale = inject(AppLocaleService);
  private readonly organizationService = inject(OrganizationService);
  private readonly commonService = inject(CommonService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  showAddDialog = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  cardSearchText = '';

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
  dialogLanguageCode: SelectFieldValue = null;
  dialogCurrencyDisplay = '';
  dialogPostalCode = '';
  dialogRemarks = '';
  showConfigDialog = false;
  showCodeTemplateDialog = false;
  showViewSidebar = false;
  configId = 0;
  configOrganizationId = 0;
  configOrganizationName = '';
  configImage = '';
  configImageName = '';
  configImageUrl = '';
  configImageFile: File | null = null;
  configThemeColor = '#7b3b1e';
  configFontSize = '14';
  configSaving = false;
  viewOrganization: any = null;
  codeTemplateMasterRows: any[] = [];
  codeTemplateTransactionRows: any[] = [];
  codeTemplateRows: any[] = [];
  codeTemplateLoading = false;
  codeTemplateSaving = false;
  codeTemplateSubmitted = false;
  codeTemplateColumns: SharedTableColumn<any>[] = CODE_TEMPLATE_COLUMNS;
  codeTemplateOrganizations: any[] = [];
  codeTemplateBranches: any[] = [];
  codeTemplateOrganization: SelectFieldValue = null;
  codeTemplateBranch: SelectFieldValue = null;
  isCodeTemplateBranchLocked = false;
  activeCodeTemplateTab: 'master' | 'transaction' = 'master';
  isCodeTemplateTabChanging = false;

  selectedRow: any = null;
  readonly pageTitle = 'Organization';
  readonly pageSubtitle = 'Maintain restaurant organization identity details.';
  cityOptions = cityOptions;
  stateOptions = stateOptions;
  countryOptions = countryOptions;
  languageOptions = languageOptions;
  dialogTitle = 'Create Organization';
  dialogSubtitle = 'Create a new restaurant organization profile.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Organization';
  allRows: any[] = [];
  tableRows: any[] = [];
  userDetails: any = {};
  isSuperAdmin = false;
  isAdminUser = false;
  organizationEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  organizationRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  showAddNewButton = false;
  showRowActions = true;
  readonly addNewButtonLabel = 'Add New';
  readonly addCodeTemplateButtonLabel = 'Add Code Template';
  rowActionItems: MenuItem[] = [];

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.isSuperAdmin = this.userDetails.RoleId == 1;
    this.isAdminUser = this.userDetails.IsAdmin == 1;
    await this.loadOrganizationRights();
    this.loadOrganizations();
  }

  async loadOrganizationRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.organizationEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.organizationRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.isSuperAdmin && this.organizationRights.Create;
      this.showRowActions =
        this.organizationRights.View
        || this.organizationRights.Edit
        || this.organizationRights.Delete
        || this.organizationRights.ActiveInActive
        || this.organizationRights.Print;
    } catch {
      this.organizationRights = {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        ActiveInActive: false,
        Print: false,
        Download: false
      };
      this.showAddNewButton = false;
      this.showRowActions = this.organizationRights.View || this.organizationRights.Print;
      this.toast.error('Rights Load Failed', 'Unable to load organization role rights. Please check and try again.');
    }
  }

  onCardSearchChange(value: string): void {
    this.cardSearchText = value;
    this.applyCardSearch();
  }
  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Organization';
    this.dialogSubtitle = 'Create a new restaurant organization profile.';
    this.dialogPrimaryActionLabel = 'Save';

    this.showAddDialog = true;

    await this.loadLatestOrganizationCode();
    await this.loadLanguages();
    await this.loadCountries();
    this.dialogLanguageCode = String(
      this.userDetails?.OrgLanguageCode
      ?? this.userDetails?.LanguageCode
      ?? 'en-IN'
    ).trim() || 'en-IN';
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

  openCodeTemplateDialog(): void {
    const currentOrgId = Number(this.userDetails.OrgId || 0);
    const currentBranchId = Number(this.userDetails.BranchId || 0);

    this.codeTemplateMasterRows = [];
    this.codeTemplateTransactionRows = [];
    this.codeTemplateRows = [];
    this.codeTemplateOrganizations = [];
    this.codeTemplateBranches = [];
    this.codeTemplateOrganization = null;
    this.codeTemplateBranch = null;
    this.codeTemplateSubmitted = false;
    this.isCodeTemplateBranchLocked = !this.isSuperAdmin && !this.isAdminUser;
    this.activeCodeTemplateTab = 'master';
    this.codeTemplateLoading = !this.isSuperAdmin;
    this.showCodeTemplateDialog = true;

    setTimeout(() => {
      void this.initializeCodeTemplateDialog(currentOrgId, currentBranchId);
    });
  }

  async initializeCodeTemplateDialog(currentOrgId: number, currentBranchId: number): Promise<void> {
    if (this.isSuperAdmin) {
      this.codeTemplateLoading = false;
      await this.loadCodeTemplateOrganizations();
    } else if (this.isAdminUser) {
      this.codeTemplateOrganization = currentOrgId;
      await this.loadCodeTemplates();
    } else {
      this.codeTemplateOrganization = currentOrgId;
      this.codeTemplateBranch = currentBranchId;
      await this.loadCodeTemplateBranches(currentOrgId);
      this.codeTemplateBranch = currentBranchId;
      await this.loadCodeTemplates();
    }
  }

  closeCodeTemplateDialog(): void {
    this.showCodeTemplateDialog = false;
    this.codeTemplateSubmitted = false;
  }

  async loadCodeTemplateOrganizations(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      const organizations = response?.result ?? [];

      this.codeTemplateOrganizations = organizations.filter((x: any) => x.IsActive).map((x: any) => ({
        label: x.Name ?? '',
        value: x.Id ?? 0
      }));
    } catch {
      this.codeTemplateOrganizations = [];
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  async loadCodeTemplateBranches(orgId: number | null): Promise<void> {
    if (!orgId || orgId === 0) {
      this.codeTemplateBranches = [];
      this.codeTemplateBranch = null;
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      const branches = response?.result ?? [];

      this.codeTemplateBranches = branches.filter((x: any) => x.IsActive).map((x: any) => ({
        label: x.Name ?? '',
        value: x.Id ?? 0
      }));
    } catch {
      this.codeTemplateBranches = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async onCodeTemplateOrganizationChange(value: SelectFieldValue): Promise<void> {
    this.codeTemplateOrganization = value;

    if (this.isCodeTemplateTabChanging) {
      return;
    }

    this.codeTemplateBranch = null;
    this.codeTemplateMasterRows = [];
    this.codeTemplateTransactionRows = [];
    this.codeTemplateRows = [];

    if (this.activeCodeTemplateTab === 'transaction') {
      await this.loadCodeTemplateBranches(Number(value || 0));
    } else {
      this.codeTemplateBranches = [];
    }

    await this.loadCodeTemplates();
  }

  async onCodeTemplateBranchChange(value: SelectFieldValue): Promise<void> {
    this.codeTemplateBranch = value;

    if (this.isCodeTemplateTabChanging) {
      return;
    }

    await this.loadCodeTemplates();
  }

  async onCodeTemplateTabChange(tab: 'master' | 'transaction'): Promise<void> {
    const currentOrgId = Number(this.userDetails.OrgId || 0);
    const currentBranchId = Number(this.userDetails.BranchId || 0);

    if (this.activeCodeTemplateTab === tab) {
      return;
    }

    this.isCodeTemplateTabChanging = true;
    try {
      if (tab === 'master') {
        this.activeCodeTemplateTab = 'master';
        this.codeTemplateBranch = null;
        this.codeTemplateBranches = [];
        this.codeTemplateRows = [];
        await this.loadCodeTemplates();
      } else {
        this.activeCodeTemplateTab = 'transaction';
        this.codeTemplateRows = [];

        if (this.isSuperAdmin) {
          await this.loadCodeTemplateBranches(Number(this.codeTemplateOrganization || 0));
        } else if (this.isAdminUser) {
          await this.loadCodeTemplateBranches(currentOrgId);
        } else {
          this.codeTemplateOrganization = currentOrgId;
          await this.loadCodeTemplateBranches(currentOrgId);
          this.codeTemplateBranch = currentBranchId;
        }

        await this.loadCodeTemplates();
      }
    } finally {
      this.isCodeTemplateTabChanging = false;
    }
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

  onCountryChange(value: SelectFieldValue): void {
    this.dialogCountry = value;
    const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(value || 0));
    this.dialogCurrencyDisplay = selectedCountry
      ? [selectedCountry.Currency, selectedCountry.CurrencyName, selectedCountry.CurrencySymbol].filter(Boolean).join(' - ')
      : '';
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

    void this.loadCities(Number(value));
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
      LanguageCode: String(this.dialogLanguageCode || '').trim() || undefined,
      PostalCode: Number(this.dialogPostalCode || 0),
      Remarks: this.dialogRemarks,
      IsActive: true,
      CreatedBy: Number(this.userDetails.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails.UserId || 0),
      UpdatedDate: null,
      IsDeleted: false,
      EntityNo: this.organizationEntityNo
    };
    try {
      let response: any;
      if (!payload.Id) {
        response = await firstValueFrom(this.organizationService.create(payload));
      } else {
        response = await firstValueFrom(this.organizationService.update(payload));
      }
      if (response.ErrorInfo.Message == true && response.result == "AlreadyExists") {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogCompanyName = '';
        return;
      }
      else if (response.ErrorInfo.Message == true && !payload.Id) {
        this.syncCurrentOrganizationLocale(Number(response.result || 0), payload.LanguageCode);
        this.toast.success('Saved', `${payload.Name || this.pageTitle} saved successfully.`);
        this.closeAddDialog();
        return;
      }
      else if (response.ErrorInfo.Message == true && payload.Id) {
        this.syncCurrentOrganizationLocale(Number(payload.Id || response.result || 0), payload.LanguageCode);
        this.toast.success('Updated', `${payload.Name || this.pageTitle} updated successfully.`);
        this.closeAddDialog();
        return;
      }
      else {
        this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save organization.');
      }

    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save organization.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async loadOrganizations(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      let RowNumber = 1;

      const organizations = Number(this.userDetails.RoleId || 0) === 1
        ? (response.result ?? [])
        : (response.result ?? []).filter((x: any) => x.Id === Number(this.userDetails.OrgId));

      const rows = organizations.map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        x.ImageUrl = '';
        return x;
      });

      for (const row of rows) {
        row.ImageUrl = await this.getOrganizationConfigImageUrl(Number(row.Id || 0));
      }

      this.allRows = [...rows];
      this.tableRows = [...rows];
      this.applyCardSearch();
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  getWebsiteUrl(website: string): string {
    if (website.startsWith('http://') || website.startsWith('https://')) {
      return website;
    }

    return `https://${website}`;
  }

  async editRow(row: any): Promise<void> {
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
      this.dialogLanguageCode = String(organization.LanguageCode ?? '').trim() || null;

      await this.loadLanguages();
      await this.loadCountries();
      this.dialogCountry = organization.Country ?? null;
      const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(this.dialogCountry || 0));
      this.dialogCurrencyDisplay = selectedCountry
        ? [selectedCountry.Currency, selectedCountry.CurrencyName, selectedCountry.CurrencySymbol].filter(Boolean).join(' - ')
        : '';

      if (this.dialogCountry) {
        await this.loadStates(Number(this.dialogCountry));
      }

      this.dialogState = organization.State ?? null;

      if (this.dialogState) {
        await this.loadCities(Number(this.dialogState));
      }

      this.dialogCity = organization.City ?? null;
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  async openConfigDialog(row: any): Promise<void> {
    this.resetConfigForm();
    this.showConfigDialog = true;

    this.configOrganizationId = Number(row['Id'] ?? 0);
    this.configOrganizationName = String(row['Name'] ?? row['name'] ?? row['companyName'] ?? row['Code'] ?? row['code'] ?? this.pageTitle);

    try {
      const response: any = await firstValueFrom(this.organizationService.GetOrganizationConfigByOrgId(this.configOrganizationId));
      const config = response?.result?.[0] ?? response?.result ?? response ?? {};

      if (config && config.Id) {
        this.configId = Number(config.Id ?? config.id ?? 0);
        this.configImage = this.normalizeConfigImageValue(String(config.Image ?? ''));
        this.configImageName = this.getConfigImageFileName(this.configImage);
        this.configImageUrl = this.getConfigImagePreviewUrl(this.configImage);
        this.configImageFile = null;
        this.configThemeColor = String(config.ThemeColor ?? config.themeColor ?? '#7b3b1e');
        this.configFontSize = String(config.FontSize ?? config.fontSize ?? '14');
      }
    } catch {
      this.configId = 0;
      this.configImage = '';
      this.configImageName = '';
      this.configImageUrl = '';
      this.configImageFile = null;
      this.configThemeColor = '#7b3b1e';
      this.configFontSize = '14';
    }

  }

  closeConfigDialog(): void {
    this.showConfigDialog = false;
  }

  async loadCodeTemplates(): Promise<void> {
    this.codeTemplateLoading = true;

    try {
      let orgId = 0;
      let branchId = 0;
      const isMasterTab = this.activeCodeTemplateTab === 'master';

      if (this.isSuperAdmin) {
        orgId = Number(this.codeTemplateOrganization || 0);

        if (!orgId) {
          this.codeTemplateMasterRows = [];
          this.codeTemplateTransactionRows = [];
          this.codeTemplateRows = [];
          this.changeDetector.detectChanges();
          return;
        }

        branchId = isMasterTab ? 0 : Number(this.codeTemplateBranch || 0);
      } else if (this.isAdminUser) {
        orgId = Number(this.userDetails.OrgId || 0);
        branchId = isMasterTab ? 0 : Number(this.codeTemplateBranch || 0);
      } else {
        orgId = Number(this.userDetails.OrgId || 0);
        branchId = isMasterTab ? 0 : Number(this.userDetails.BranchId || 0);
      }

      const response: any = await firstValueFrom(this.organizationService.GetAllCodeTemplate(orgId, branchId, isMasterTab));
      let RowNumber = 1;
      const rows = (response?.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.IsDateMonthYearWise = x.IsDateMonthYearWise === true;
        return x;
      });

      if (isMasterTab) {
        this.codeTemplateMasterRows = rows;
        this.codeTemplateRows = [...this.codeTemplateMasterRows];
      } else {
        this.codeTemplateTransactionRows = rows;
        this.codeTemplateRows = [...this.codeTemplateTransactionRows];
      }

      this.changeDetector.detectChanges();
    } catch {
      if (this.activeCodeTemplateTab === 'master') {
        this.codeTemplateMasterRows = [];
      } else {
        this.codeTemplateTransactionRows = [];
      }
      this.codeTemplateRows = [];
      this.changeDetector.detectChanges();
      this.toast.error('Load Failed', 'Unable to load code templates. Please check and try again.');
    } finally {
      this.codeTemplateLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async submitCodeTemplates(): Promise<void> {
    this.codeTemplateSubmitted = true;
    this.codeTemplateSaving = true;

    try {
      let selectedOrgId = 0;
      let selectedBranchId = 0;
      const isMasterTab = this.activeCodeTemplateTab === 'master';

      if (this.isSuperAdmin) {
        selectedOrgId = Number(this.codeTemplateOrganization || 0);
        selectedBranchId = isMasterTab ? 0 : Number(this.codeTemplateBranch || 0);
      } else if (this.isAdminUser) {
        selectedOrgId = Number(this.userDetails.OrgId || 0);
        selectedBranchId = isMasterTab ? 0 : Number(this.codeTemplateBranch || 0);
      } else {
        selectedOrgId = Number(this.userDetails.OrgId || 0);
        selectedBranchId = isMasterTab ? 0 : Number(this.userDetails.BranchId || 0);
      }

      if (!selectedOrgId) {
        this.toast.warn('Select Organization', 'Please select organization first.');
        return;
      }

      if (!isMasterTab && !selectedBranchId) {
        this.toast.warn('Select Branch', 'Please select branch first.');
        return;
      }

      const rows = isMasterTab ? this.codeTemplateMasterRows : this.codeTemplateTransactionRows;

      const payload = rows.map((x: any) => ({
        Id: Number(x.Id || 0),
        EntityNo: Number(x.EntityNo || 0),
        Name: x.Name ?? '',
        NoOfDigit: Number(x.NoOfDigit || 0),
        StartValue: Number(x.StartValue || 0),
        Prefix: x.Prefix ?? '',
        CurrentValue: x.CurrentValue ?? '',
        Suffix: x.Suffix ?? '',
        BranchId: selectedBranchId,
        IsMaster: isMasterTab,
        IsDateMonthYearWise: x.IsDateMonthYearWise === true,
        OrgId: selectedOrgId,
        IsActive: x.IsActive === true,
        IsDeleted: x.IsDeleted === false,
        CreatedBy: Number(this.userDetails.UserId || 0),
        CreatedDate: new Date().toISOString(),
        UpdatedBy: Number(this.userDetails.UserId || 0),
        UpdatedDate: new Date().toISOString(),
      }));

      const response: any = await firstValueFrom(this.organizationService.CreateCodetemplate(payload));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Saved', 'Code templates saved successfully.');
        this.closeCodeTemplateDialog();
        return;
      }

      this.toast.error('Save Failed', response?.ErrorInfo?.Message || 'Unable to save code templates.');
    } catch {
      this.toast.error('Save Failed', 'Unable to save code templates.');
    } finally {
      this.codeTemplateSaving = false;
    }
  }

  closeViewSidebar(): void {
    this.showViewSidebar = false;
    this.viewOrganization = null;
  }

  async submitConfigDialog(): Promise<void> {
    this.configSaving = true;

    const payload: OrganizationConfig = {
      Id: this.configId,
      Image: this.configImage,
      ImageFile: this.configImageFile,
      ThemeColor: this.configThemeColor,
      FontSize: Number(this.configFontSize || 14),
      OrgId: this.configOrganizationId,
      IsActive: true,
      CreatedBy: Number(this.userDetails.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails.UserId || 0),
      UpdatedDate: new Date().toISOString(),
      IsDeleted: false,
    };

    try {
      const formData = this.createOrganizationConfigFormData(payload);
      const response: any = await firstValueFrom(this.organizationService.CreateUpdateOrganizationConfig(formData));
      if (response.ErrorInfo.Message === true) {
        this.toast.success('Config Saved', `${this.configOrganizationName || this.pageTitle} configuration saved successfully.`);
        this.closeConfigDialog();
        setTimeout(() => {
          window.location.reload();
        }, 300);
        return;
      }
      else {
        this.toast.error('Save Failed', response.ErrorInfo.Message || 'Unable to save organization configuration.');
      }


      this.toast.error('Save Failed', response?.ErrorInfo?.Message || 'Unable to save organization configuration.');
    } catch {
      this.toast.error('Save Failed', 'Unable to save organization configuration.');
    } finally {
      this.configSaving = false;
    }
  }

  onConfigImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.configImageName = this.getConfigImageFileName(this.configImage);
      this.configImageFile = null;
      return;
    }

    this.configImage = file.name;
    this.configImageName = file.name;
    this.configImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.configImageUrl = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  async deleteRow(row: any): Promise<void> {
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

  async activateRow(row: any): Promise<void> {
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

  async deactivateRow(row: any): Promise<void> {
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

  async viewRow(row: any): Promise<void> {
    try {
      await this.loadCountries();
      this.showViewSidebar = true;

      const response: any = await firstValueFrom(this.organizationService.getById(row['Id']));
      const organization = response.result ?? {};
      const imageUrl = await this.getOrganizationConfigImageUrl(Number(row['Id'] ?? 0));
      const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(organization.Country || 0));
      const currencyDisplay = selectedCountry
        ? [selectedCountry.Currency, selectedCountry.CurrencyName, selectedCountry.CurrencySymbol].filter(Boolean).join(' - ')
        : '-';

      this.viewOrganization = {
        Code: organization.Code ?? '',
        Name: organization.Name ?? '',
        ImageUrl: imageUrl,
        GSTNo: organization.GSTNo ?? '',
        RegistrationNo: organization.RegistrationNo ?? '',
        Phone: organization.Phone ?? '',
        Email: organization.Email ?? '',
        Website: organization.Website ?? '',
        ContactPerson: organization.ContactPerson ?? '',
        ContactMobileNo: organization.ContactMobileNo ?? '',
        ContactEmail: organization.ContactEmail ?? '',
        CurrencyDisplay: currencyDisplay,
        LanguageCode: organization.LanguageCode ?? '-',
        Remarks: organization.Remarks ?? '',
        Status: organization.IsActive ? 'Active' : 'Inactive'
      };

    } catch {
      this.toast.error('Load Failed', 'Unable to load organization details. Please check and try again.');
    }
  }

  openRowActions(menu: any, event: Event, row: any): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: any): void {
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

  confirmActivateRow(row: any): void {
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

  confirmDeactivateRow(row: any): void {
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

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    if (!keepCode) {
      this.dialogCode = '';
    }
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
    this.dialogLanguageCode = null;
    this.dialogCurrencyDisplay = '';
    this.dialogPostalCode = '';
    this.dialogRemarks = '';
  }

  private async loadLatestOrganizationCode(): Promise<void> {
    if (!this.organizationEntityNo) {
      this.dialogCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.organizationEntityNo, 0, 0));

      this.dialogCode = response?.result ?? '';
    } catch {
      this.dialogCode = '';
      this.toast.error('Load Failed', 'Unable to load organization code. Please check and try again.');
    }
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private resetConfigForm(): void {
    this.configId = 0;
    this.configOrganizationId = 0;
    this.configImage = '';
    this.configImageName = '';
    this.configImageUrl = '';
    this.configImageFile = null;
    this.configThemeColor = '#7b3b1e';
    this.configFontSize = '14';
    this.configSaving = false;
  }

  private createOrganizationConfigFormData(payload: OrganizationConfig): FormData {
    const formData = new FormData();

    formData.append('Id', String(payload.Id ?? 0));
    formData.append('Image', payload.Image ?? '');
    formData.append('ThemeColor', payload.ThemeColor ?? '');
    formData.append('FontSize', String(payload.FontSize ?? 14));
    formData.append('OrgId', String(payload.OrgId ?? 0));
    formData.append('IsActive', String(payload.IsActive ?? true));
    formData.append('CreatedBy', String(payload.CreatedBy ?? 0));
    formData.append('CreatedDate', payload.CreatedDate ?? '');
    formData.append('UpdatedBy', String(payload.UpdatedBy ?? 0));
    formData.append('UpdatedDate', payload.UpdatedDate ?? '');
    formData.append('IsDeleted', String(payload.IsDeleted ?? false));

    if (payload.ImageFile) {
      formData.append('ImageFile', payload.ImageFile, payload.ImageFile.name);
    }

    return formData;
  }

  private normalizeConfigImageValue(image: string): string {
    let normalizedImage = image.trim();

    if (!normalizedImage) {
      return '';
    }

    if (normalizedImage.startsWith('data:')) {
      return normalizedImage;
    }

    const marker = '/FileUpload/';
    const markerIndex = normalizedImage.indexOf(marker);

    if (markerIndex >= 0) {
      normalizedImage = normalizedImage.substring(markerIndex + marker.length);
    }

    normalizedImage = normalizedImage.replace(/^\/+/, '');

    while (normalizedImage.startsWith('FileUpload/')) {
      normalizedImage = normalizedImage.substring('FileUpload/'.length);
    }

    while (normalizedImage.startsWith('Organization/')) {
      normalizedImage = normalizedImage.substring('Organization/'.length);
    }

    return this.getConfigImageFileName(normalizedImage);
  }

  private async getOrganizationConfigImageUrl(orgId: number): Promise<string> {
    if (!orgId) {
      return '';
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetOrganizationConfigByOrgId(orgId));
      const config = response?.result?.[0] ?? response?.result ?? response ?? {};
      const image = String(config.Image ?? config.image ?? '');

      if (!image) {
        return '';
      }

      return this.getConfigImagePreviewUrl(image);
    } catch {
      return '';
    }
  }

  private getConfigImagePreviewUrl(image: string): string {
    if (!image) {
      return '';
    }

    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
      return image;
    }

    const normalizedImage = this.normalizeConfigImageValue(image);

    if (!normalizedImage) {
      return '';
    }

    if (normalizedImage.startsWith('Organization/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    if (normalizedImage.includes('/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    return `${this.runtimeConfig.apiBaseUrl}/FileUpload/Organization/${normalizedImage}`;
  }

  private getConfigImageFileName(image: string): string {
    if (!image) {
      return '';
    }

    const parts = image.split(/[\\/]/);
    return parts[parts.length - 1] ?? '';
  }

  private applyCardSearch(): void {
    const searchText = this.cardSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) => {
      return String(row.Name ?? '').toLowerCase().includes(searchText)
        || String(row.Code ?? '').toLowerCase().includes(searchText)
        || String(row.Email ?? '').toLowerCase().includes(searchText)
        || String(row.Phone ?? '').toLowerCase().includes(searchText)
        || String(row.Website ?? '').toLowerCase().includes(searchText);
    });
  }

  private getRowActionItems(row: any): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.organizationRights.View) {
      items.push({ label: 'View', icon: 'pi pi-eye', styleClass: 'row-action-view', command: () => this.handleRowAction('view') });
    }

    if (this.userDetails.RoleId === 1) {
      if (this.organizationRights.Edit && row['IsActive'] === true) {
        items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      }

      if (this.organizationRights.ActiveInActive && row['IsActive'] === true) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      }

      if (this.organizationRights.ActiveInActive && row['IsActive'] !== true) {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }

      if (this.organizationRights.Edit) {
        items.push({ label: 'Add Config', icon: 'pi pi-cog', styleClass: 'row-action-config', command: () => this.handleRowAction('config') });
      }

      if (this.organizationRights.Delete) {
        items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
      }

      if (this.organizationRights.Print) {
        items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
      }

      return items;
    }

    if (this.userDetails.IsAdmin === true) {
      if (this.organizationRights.Edit && row['IsActive'] === true) {
        items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      }

      if (this.organizationRights.ActiveInActive && row['IsActive'] === true) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      }

      if (this.organizationRights.ActiveInActive && row['IsActive'] !== true) {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }

      if (this.organizationRights.Edit) {
        items.push({ label: 'Add Config', icon: 'pi pi-cog', styleClass: 'row-action-config', command: () => this.handleRowAction('config') });
      }

      if (this.organizationRights.Print) {
        items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
      }
    }

    return items;
  }

  private handleRowAction(action: 'view' | 'config' | 'edit' | 'delete' | 'activate' | 'deactivate' | 'print'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'view') {
      this.viewRow(this.selectedRow);
    } else if (action === 'config') {
      this.openConfigDialog(this.selectedRow);
    } else if (action === 'edit') {
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

  printRow(row: any): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Organization')} print will be connected later.`);
  }

  private syncCurrentOrganizationLocale(savedOrgId: number, languageCode?: string): void {
    const currentOrgId = Number(this.userDetails?.OrgId || this.userDetails?.OrganizationId || 0);
    if (!savedOrgId || savedOrgId !== currentOrgId) {
      return;
    }

    const selectedCountry = this.countryOptions.find((country: any) => Number(country.value || 0) === Number(this.dialogCountry || 0));
    const selectedState = this.stateOptions.find((state: any) => Number(state.value || 0) === Number(this.dialogState || 0));
    const selectedCity = this.cityOptions.find((city: any) => Number(city.value || 0) === Number(this.dialogCity || 0));
    const timezone = selectedCity?.Timezone || selectedState?.Timezone || this.userDetails?.OrgTimezone || '';

    const updatedUserDetails = {
      ...this.userDetails,
      OrgLanguageCode: languageCode || this.userDetails?.OrgLanguageCode || '',
      OrgCurrencyCode: selectedCountry?.Currency || this.userDetails?.OrgCurrencyCode || '',
      OrgCurrencyName: selectedCountry?.CurrencyName || this.userDetails?.OrgCurrencyName || '',
      OrgCurrencySymbol: selectedCountry?.CurrencySymbol || this.userDetails?.OrgCurrencySymbol || '',
      OrgTimezone: timezone,
      LanguageCode: String(
        this.userDetails?.BranchLanguageCode
        || languageCode
        || this.userDetails?.OrgLanguageCode
        || ''
      ).trim()
    };

    this.userDetails = updatedUserDetails;
    localStorage.setItem('userDetails', JSON.stringify(updatedUserDetails));
    this.appLocale.syncFromUserDetails(updatedUserDetails);
  }
}


