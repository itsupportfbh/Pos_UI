import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableComponent, SharedTablePaginationMode } from '../../../components/table/shared-table.component';
import { FeatureFieldConfig, FeaturePageConfig } from '../config/models';
import { AppToastService } from '../../../services/app-toast.service';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Staff', value: 'Staff' },
  { label: 'Cashier', value: 'Cashier' }
];
const BRANCH_OPTIONS = [
  { label: 'Head Office', value: 'Head Office' },
  { label: 'City Center', value: 'City Center' },
  { label: 'Airport Kiosk', value: 'Airport Kiosk' }
];
const ROLE_FIELDS: FeatureFieldConfig[] = [
  { key: 'role', label: 'Role', type: 'select', placeholder: 'Choose role', options: ROLE_OPTIONS },
  { key: 'branch', label: 'Branch', type: 'select', placeholder: 'Choose branch', options: BRANCH_OPTIONS }
];
const CODE_NAME_COLUMNS: FeaturePageConfig['columns'] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

const PAGE_CONFIG: FeaturePageConfig = {
  eyebrow: 'Users & Roles',
  title: 'Users',
  subtitle: 'Manage admin, cashier, and staff accounts.',
  formTitle: `${'Users'} Filters`,
  formDescription: `Static ${'Users'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Users',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'USR-01', name: 'Antony Admin', status: 'Active' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Users & Roles', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: ROLE_FIELDS,
  primaryActionLabel: `Search ${'Users'}`,
  secondaryActionLabel: 'Clear Filters',
  showAddNewButton: true,
  addNewLabel: 'Add New',
  tableCaption: 'Users',
  rows: [{ code: 'USR-01', name: 'Antony Admin', status: 'Active' }],
  columns: CODE_NAME_COLUMNS
};
const ADD_DIALOG_CONFIG: FeaturePageConfig | null = {
  eyebrow: 'Users & Roles',
  title: 'Create User',
  subtitle: 'Create a new user account.',
  formTitle: `${'Create User'} Filters`,
  formDescription: `Static ${'Create User'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Create User',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'USR-12', name: 'Riya Admin', status: 'Draft' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Users & Roles', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: ROLE_FIELDS,
  primaryActionLabel: `Search ${'Create User'}`,
  secondaryActionLabel: 'Clear Filters',
  tableCaption: 'Create User',
  rows: [{ code: 'USR-12', name: 'Riya Admin', status: 'Draft' }],
  columns: CODE_NAME_COLUMNS
};


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly toast = inject(AppToastService);
  readonly paginationMode: SharedTablePaginationMode = 'client';
  readonly config: FeaturePageConfig = PAGE_CONFIG;
  readonly addDialogConfig: FeaturePageConfig | null = ADD_DIALOG_CONFIG;
  showAddDialog = false;
  showFilterSidebar = false;
  filterRole: string | null = null;
  filterBranch: string | null = null;
  dialogRole: string | null = null;
  dialogBranch: string | null = null;
  readonly pageEyebrow = this.config.eyebrow;
  readonly pageTitle = this.config.title;
  readonly pageSubtitle = this.config.subtitle;
  readonly roleOptions = ROLE_OPTIONS;
  readonly branchOptions = BRANCH_OPTIONS;
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
  readonly tableEmptyMessage = this.config.emptyMessage ?? 'No records found.';
  readonly tablePageSize = 5;
  readonly tableRowsPerPageOptions = [5, 10];
  readonly tableShowGridlines = true;
  readonly tableStripedRows = true;
    readonly tableRowHover = true;
    readonly showAddNewButton = !!this.addDialogConfig;
    readonly addNewButtonLabel = this.showAddNewButton ? (this.config.addNewLabel ?? 'Add New') : '';
    readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  resetForm(): void {
    this.filterRole = null;
    this.filterBranch = null;
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
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.toast.success('Saved', `${this.dialogTitle || this.pageTitle} saved successfully.`);
    this.closeAddDialog();
  }

  editRow(row: Record<string, unknown>): void {
    if (!this.addDialogConfig) {
      return;
    }

    this.dialogRole = typeof row['role'] === 'string' ? row['role'] : null;
    this.dialogBranch = typeof row['branch'] === 'string' ? row['branch'] : null;
    this.showAddDialog = true;
    this.toast.info('Edit Mode', `Editing ${String(row['name'] ?? row['code'] ?? this.pageTitle)}.`);
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

  getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    return [
      { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.editRow(row) },
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.deleteRow(row) },
      { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.activateRow(row) },
      { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.deactivateRow(row) }
    ];
  }

  private resetDialogForm(): void {
    this.dialogRole = null;
    this.dialogBranch = null;
  }
}













