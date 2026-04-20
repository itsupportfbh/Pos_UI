import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';
import { SharedTableComponent } from '../../../components/table/shared-table.component';
import { FeaturePageConfig } from '../config/models';
import { AppToastService } from '../../../services/app-toast.service';
import { Organization, OrganizationService } from '../../../services/organization.service';

const BRANCH_OPTIONS = [
  { label: 'Head Office', value: 'Head Office' },
  { label: 'City Center', value: 'City Center' },
  { label: 'Airport Kiosk', value: 'Airport Kiosk' }
];

const cityOptions:any = [];
const stateOptions:any = [];
const countryOptions:any = [];

const CODE_NAME_COLUMNS: FeaturePageConfig['columns'] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

const PAGE_CONFIG: FeaturePageConfig = {
  eyebrow: 'Organization',
  title: 'Organization',
  subtitle: 'Maintain restaurant organization identity details.',
  formTitle: `${'Organization'} Filters`,
  formDescription: `Static ${'Organization'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Organization',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'ORG-01', name: 'Unity Work Restaurants', status: 'Active' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Organization', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [{ key: 'companyName', label: 'Organization Name', type: 'text', placeholder: 'Unity Work Restaurants' }],
  primaryActionLabel: `Search ${'Organization'}`,
  secondaryActionLabel: 'Clear Filters',
  showAddNewButton: true,
  addNewLabel: 'Add New',
  tableCaption: 'Organization',
  rows: [{ code: 'ORG-01', name: 'Unity Work Restaurants', companyName: 'Unity Work Restaurants', branch: 'Head Office', status: 'Active' }],
  columns: CODE_NAME_COLUMNS
};
const ADD_DIALOG_CONFIG: FeaturePageConfig | null = {
  eyebrow: 'Organization',
  title: 'Create Organization',
  subtitle: 'Create a new restaurant organization profile.',
  formTitle: `${'Create Organization'} Filters`,
  formDescription: `Static ${'Create Organization'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Create Organization',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'ORG-02', name: 'Unity Work South', status: 'Draft' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Organization', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [{ key: 'companyName', label: 'Organization Name', type: 'text', placeholder: 'Unity Work Restaurants' }, { key: 'branch', label: 'Primary Branch', type: 'select', placeholder: 'Choose branch', options: BRANCH_OPTIONS }],
  primaryActionLabel: `Search ${'Create Organization'}`,
  secondaryActionLabel: 'Clear Filters',
  tableCaption: 'Create Organization',
  rows: [{ code: 'ORG-02', name: 'Unity Work South', companyName: 'Unity Work South', branch: 'City Center', status: 'Draft' }],
  columns: CODE_NAME_COLUMNS
};


@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.css'
})
export class OrganizationComponent {
  private readonly toast = inject(AppToastService);
  private readonly organizationService = inject(OrganizationService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  readonly config: FeaturePageConfig = PAGE_CONFIG;
  readonly addDialogConfig: FeaturePageConfig | null = ADD_DIALOG_CONFIG;
  showAddDialog = false;
  dialogSubmitted = false;
  dialogSaving = false;
  showFilterSidebar = false;
  filterCompanyName = '';

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
  dialogCity: string | null = null;
  dialogState: string | null = null;
  dialogCountry: string | null = null;
  dialogPostalCode = '';
  dialogRemarks = '';
  dialogBranch: string | null = null;
  showConfigDialog = false;
  configOrganizationName = '';
  configImageName = '';
  configThemeColor = '#2f7d57';
  configFontSize = '14';

  selectedRow: Record<string, unknown> | null = null;
  readonly pageEyebrow = this.config.eyebrow;
  readonly pageTitle = this.config.title;
  readonly pageSubtitle = this.config.subtitle;
  readonly branchOptions = BRANCH_OPTIONS;
  readonly cityOptions = cityOptions;
  readonly stateOptions = stateOptions;
  readonly countryOptions = countryOptions;
  readonly summaryCards = this.config.summaryCards;
  readonly filterTitle = this.config.formTitle ?? `${this.config.title} Form`;
  readonly filterDescription = this.config.formDescription ?? '';
  readonly fields = this.config.fields;
  readonly primaryActionLabel = this.config.primaryActionLabel;
  readonly secondaryActionLabel = this.config.secondaryActionLabel ?? '';
  readonly showSecondaryAction = !!this.config.secondaryActionLabel;
  readonly dialogTitle = this.addDialogConfig?.title ?? '';
  readonly dialogSubtitle = this.addDialogConfig?.subtitle ?? '';
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = this.config.tableTitle ?? this.config.tableCaption;
  readonly tableDescription = this.config.tableDescription ?? '';
  readonly tableCaption = this.config.tableCaption;
  readonly tableColumns = this.config.columns;
  readonly tableRows = this.config.rows;
    readonly showAddNewButton = !!this.addDialogConfig;
    readonly addNewButtonLabel = this.showAddNewButton ? (this.config.addNewLabel ?? 'Add New') : '';
    readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') },
    { label: 'Add Config', icon: 'pi pi-cog', styleClass: 'row-action-config', command: () => this.handleRowAction('config') }
  ];

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
    if (!this.addDialogConfig) {
      return;
    }

    this.resetDialogForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: Organization = {
      code: this.dialogCode,
      name: this.dialogCompanyName,
      companyName: this.dialogCompanyName,
      gstNumber: this.dialogGstNumber,
      registrationNumber: this.dialogRegistrationNumber,
      phoneNumber: this.dialogPhoneNumber,
      email: this.dialogEmail,
      website: this.dialogWebsite,
      contactPerson: this.dialogContactPerson,
      contactPersonPhone: this.dialogContactPersonPhone,
      contactPersonEmail: this.dialogContactPersonEmail,
      addressLine1: this.dialogAddressLine1,
      addressLine2: this.dialogAddressLine2,
      city: this.dialogCity ?? '',
      state: this.dialogState ?? '',
      country: this.dialogCountry ?? '',
      postalCode: this.dialogPostalCode,
      remarks: this.dialogRemarks,
      branch: this.dialogBranch ?? '',
      status: 'Active'
    };

    try {
      const savedOrganization = await firstValueFrom(this.organizationService.create(payload));

      this.tableRows.push({
        code: savedOrganization.code ?? payload.code,
        name: savedOrganization.name ?? savedOrganization.companyName ?? payload.name,
        companyName: savedOrganization.companyName ?? payload.companyName,
        branch: savedOrganization.branch ?? payload.branch,
        status: savedOrganization.status ?? 'Active'
      });

      this.toast.success('Saved', `${payload.name || this.pageTitle} saved successfully.`);
      this.closeAddDialog();
    } catch {
      this.toast.error('Save Failed', 'Unable to save organization. Please check API and try again.');
    } finally {
      this.dialogSaving = false;
    }
  }

  editRow(row: Record<string, unknown>): void {
    if (!this.addDialogConfig) {
      return;
    }

    this.resetDialogForm();
    this.dialogCompanyName = String(row['companyName'] ?? row['name'] ?? '');
    this.dialogBranch = typeof row['branch'] === 'string' ? row['branch'] : null;
    this.showAddDialog = true;
    this.toast.info('Edit Mode', `Editing ${String(row['name'] ?? row['code'] ?? this.pageTitle)}.`);
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

  deleteRow(row: Record<string, unknown>): void {
    const rowIndex = this.tableRows.indexOf(row);

    if (rowIndex >= 0) {
      this.tableRows.splice(rowIndex, 1);
    }

    this.toast.warn('Deleted', `${String(row['name'] ?? row['code'] ?? 'Record')} removed successfully.`);
  }

  activateRow(row: Record<string, unknown>): void {
    row['status'] = 'Active';
    this.toast.success('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as active.`);
  }

  deactivateRow(row: Record<string, unknown>): void {
    row['status'] = 'Inactive';
    this.toast.info('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as inactive.`);
  }

  openRowActions(menu: any, event: Event, row: Record<string, unknown>): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogCode = '';
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
    this.dialogBranch = null;
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private resetConfigForm(): void {
    this.configImageName = '';
    this.configThemeColor = '#2f7d57';
    this.configFontSize = '14';
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
      this.deleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.activateRow(this.selectedRow);
    } else {
      this.deactivateRow(this.selectedRow);
    }
  }
}













