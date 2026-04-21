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

const ROLE_OPTIONS: { label: string | number; value: string | number }[] = [];
const BRANCH_OPTIONS: { label: string | number; value: string | number }[] = [];
const ROLE_FIELDS: any[] = [
  { key: 'role', label: 'Role', type: 'select', placeholder: 'Choose role', options: ROLE_OPTIONS },
  { key: 'branch', label: 'Branch', type: 'select', placeholder: 'Choose branch', options: BRANCH_OPTIONS }
];
const CODE_NAME_COLUMNS: SharedTableColumn<Record<string, unknown>>[] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent {
  private readonly toast = inject(AppToastService);  showAddDialog = false;
  showFilterSidebar = false;
  showPermissionsDialog = false;
  permissionRoleName = '';
  permissionSearchText = '';
  filterRole: string | null = null;
  filterBranch: string | null = null;
  dialogRoleName = '';
  dialogBranch: string | null = null;
  selectedRow: Record<string, unknown> | null = null;
  permissionPages: PagePermission[] = [];
  readonly pageEyebrow = 'Users & Roles';
  readonly pageTitle = 'Roles';
  readonly pageSubtitle = 'Define role templates.';
  readonly roleOptions = ROLE_OPTIONS;
  readonly branchOptions = BRANCH_OPTIONS;
  
  readonly filterTitle = `${'Roles'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Roles'.toLowerCase()}.`;
  readonly fields: any[] = ROLE_FIELDS;
  readonly primaryActionLabel = `Search ${'Roles'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = 'Create Role';
  readonly dialogSubtitle = 'Create a new role template.';
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Roles';
  readonly tableDescription = 'API response data will be shown here.';
  readonly tableCaption = 'Roles';
  readonly tableColumns = CODE_NAME_COLUMNS;
  tableRows: Record<string, unknown>[] = [];
    readonly showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
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

















