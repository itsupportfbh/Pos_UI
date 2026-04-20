import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';

type PagePermission = {
  pageName: string;
  groupName: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
};

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
  title: 'Roles',
  subtitle: 'Define role templates.',
  formTitle: `${'Roles'} Filters`,
  formDescription: `Static ${'Roles'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Roles',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'ROL-01', name: 'Admin', status: 'Active' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Users & Roles', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: ROLE_FIELDS,
  primaryActionLabel: `Search ${'Roles'}`,
  secondaryActionLabel: 'Clear Filters',
  showAddNewButton: true,
  addNewLabel: 'Add New',
  tableCaption: 'Roles',
  rows: [{ code: 'ROL-01', name: 'Admin', status: 'Active' }],
  columns: CODE_NAME_COLUMNS
};
const ADD_DIALOG_CONFIG: FeaturePageConfig | null = {
  eyebrow: 'Users & Roles',
  title: 'Create Role',
  subtitle: 'Create a new role template.',
  formTitle: `${'Create Role'} Filters`,
  formDescription: `Static ${'Create Role'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Create Role',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'ROL-09', name: 'Senior Cashier', status: 'Draft' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Users & Roles', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [{ key: 'roleName', label: 'Role Name', type: 'text', placeholder: 'Senior Cashier' }, { key: 'branch', label: 'Branch', type: 'select', placeholder: 'Choose branch', options: BRANCH_OPTIONS }],
  primaryActionLabel: `Search ${'Create Role'}`,
  secondaryActionLabel: 'Clear Filters',
  tableCaption: 'Create Role',
  rows: [{ code: 'ROL-09', name: 'Senior Cashier', status: 'Draft' }],
  columns: CODE_NAME_COLUMNS
};


type FeatureFieldType = 'text' | 'select' | 'autocomplete' | 'date';

interface FeatureFieldConfig {
  key: string;
  label: string;
  type: FeatureFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string | number; value: string | number }[];
  suggestions?: string[];
  optionLabel?: string;
  showClear?: boolean;
  filter?: boolean;
  dropdown?: boolean;
  forceSelection?: boolean;
  showIcon?: boolean;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
}

interface SummaryCard {
  label: string;
  value: string;
  caption: string;
}

interface FeaturePageConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  formTitle?: string;
  formDescription?: string;
  tableTitle?: string;
  tableDescription?: string;
  helperPoints?: string[];
  summaryCards: SummaryCard[];
  fields: FeatureFieldConfig[];
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  showAddNewButton?: boolean;
  addNewLabel?: string;
  tableCaption: string;
  emptyMessage?: string;
  rows: Record<string, unknown>[];
  columns: SharedTableColumn<Record<string, unknown>>[];
}
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent {
  private readonly toast = inject(AppToastService);
  readonly config: FeaturePageConfig = PAGE_CONFIG;
  readonly addDialogConfig: FeaturePageConfig | null = ADD_DIALOG_CONFIG;
  showAddDialog = false;
  showFilterSidebar = false;
  showPermissionsDialog = false;
  permissionRoleName = '';
  permissionSearchText = '';
  filterRole: string | null = null;
  filterBranch: string | null = null;
  dialogRoleName = '';
  dialogBranch: string | null = null;
  selectedRow: Record<string, unknown> | null = null;
  permissionPages: PagePermission[] = [
    { groupName: 'Billing', pageName: 'Billing', view: true, add: true, edit: true, delete: false, print: true },
    { groupName: 'Billing', pageName: 'Print Bills', view: true, add: false, edit: false, delete: false, print: true },
    { groupName: 'Food Menu', pageName: 'Menus', view: true, add: true, edit: true, delete: false, print: false },
    { groupName: 'Food Menu', pageName: 'Categories', view: true, add: true, edit: true, delete: false, print: false },
    { groupName: 'Inventory', pageName: 'Stock In', view: true, add: true, edit: true, delete: false, print: false },
    { groupName: 'Inventory', pageName: 'Current Stock', view: true, add: false, edit: false, delete: false, print: true },
    { groupName: 'Orders', pageName: 'Return Refund', view: true, add: true, edit: true, delete: false, print: true },
    { groupName: 'Reports', pageName: 'Daily Sales', view: true, add: false, edit: false, delete: false, print: true },
    { groupName: 'Reports', pageName: 'Monthly Sales', view: true, add: false, edit: false, delete: false, print: true },
    { groupName: 'Reports', pageName: 'Menu wise Sales', view: true, add: false, edit: false, delete: false, print: true },
    { groupName: 'Organization', pageName: 'Organization', view: true, add: true, edit: true, delete: false, print: false },
    { groupName: 'Users & Roles', pageName: 'Users', view: true, add: true, edit: true, delete: false, print: false }
  ];
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
    readonly showAddNewButton = !!this.addDialogConfig;
    readonly addNewButtonLabel = this.showAddNewButton ? (this.config.addNewLabel ?? 'Add New') : '';
    readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Permissions', icon: 'pi pi-lock', styleClass: 'row-action-permissions', command: () => this.handleRowAction('permissions') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  get filteredPermissionPages(): PagePermission[] {
    const searchText = this.permissionSearchText.trim().toLowerCase();

    if (!searchText) {
      return this.permissionPages;
    }

    return this.permissionPages.filter((page) =>
      page.groupName.toLowerCase().includes(searchText) ||
      page.pageName.toLowerCase().includes(searchText)
    );
  }

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

    this.dialogRoleName = String(row['roleName'] ?? row['name'] ?? '');
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

  openPermissionsDialog(row: Record<string, unknown>): void {
    this.permissionRoleName = String(row['name'] ?? row['code'] ?? this.pageTitle);
    this.permissionSearchText = '';
    this.showPermissionsDialog = true;
  }

  closePermissionsDialog(): void {
    this.showPermissionsDialog = false;
  }

  savePermissionsDialog(): void {
    this.toast.success('Permissions Saved', `${this.permissionRoleName || 'Role'} permissions saved successfully.`);
    this.closePermissionsDialog();
  }

  setPagePermission(page: PagePermission, permission: keyof Omit<PagePermission, 'pageName' | 'groupName'>, event: Event): void {
    page[permission] = (event.target as HTMLInputElement).checked;
  }

  setAllPagePermissions(page: PagePermission, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    page.view = checked;
    page.add = checked;
    page.edit = checked;
    page.delete = checked;
    page.print = checked;
  }

  isFullAccess(page: PagePermission): boolean {
    return page.view && page.add && page.edit && page.delete && page.print;
  }

  openRowActions(menu: any, event: Event, row: Record<string, unknown>): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private handleRowAction(action: 'permissions' | 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'permissions') {
      this.openPermissionsDialog(this.selectedRow);
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

  private resetDialogForm(): void {
    this.dialogRoleName = '';
    this.dialogBranch = null;
  }
}

















