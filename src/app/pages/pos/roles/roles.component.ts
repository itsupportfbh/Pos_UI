import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
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

type RoleRow = {
  Id: number;
  Code: string;
  Name: string;
  Remarks: string;
  Status: string;
  IsActive: boolean;
};

const ROLE_COLUMNS: SharedTableColumn<RoleRow>[] = [
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'Remarks', header: 'Remarks', sortable: true, width: '18rem' },
  {
    field: 'Status',
    header: 'Status',
    type: 'tag',
    sortable: true,
    width: '8rem',
    tagSeverityMap: { Active: 'success', Inactive: 'danger' }
  }
];

const PERMISSION_PAGES: PagePermission[] = [
  { groupName: 'Organization', pageName: 'Organization', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Organization', pageName: 'Branches', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Organization', pageName: 'Counters', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Organization', pageName: 'Terminal', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Organization', pageName: 'Printers', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Users & Roles', pageName: 'Users', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Users & Roles', pageName: 'Roles', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Food Menu', pageName: 'Categories', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Food Menu', pageName: 'Menus', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Reports', pageName: 'Daily Sales', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Reports', pageName: 'Monthly Sales', view: false, add: false, edit: false, delete: false, print: false },
  { groupName: 'Reports', pageName: 'Menu Wise Sales', view: false, add: false, edit: false, delete: false, print: false }
];

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  providers: [ConfirmationService],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  showPermissionsDialog = false;
  isEditMode = false;
  dialogSubmitted = false;
  filterRoleName = '';
  permissionRoleName = '';
  permissionSearchText = '';

  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';

  selectedRow: RoleRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: RoleRow[] = [];
  tableRows: RoleRow[] = [];
  permissionPages: PagePermission[] = [];

  readonly pageEyebrow = 'Users & Roles';
  readonly pageTitle = 'Roles';
  readonly pageSubtitle = 'Maintain role master details.';
  readonly filterTitle = 'Role Filters';
  readonly primaryActionLabel = 'Search Roles';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Role';
  dialogSubtitle = 'Create a new role template.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Roles';
  readonly tableCaption = 'Roles';
  readonly tableColumns = ROLE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  constructor() {
    this.permissionPages = PERMISSION_PAGES.map((page) => ({ ...page }));
  }

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
    this.filterRoleName = '';
    this.tableRows = [...this.allRows];
  }

  searchRoles(): void {
    const name = this.filterRoleName.trim().toLowerCase();

    if (!name) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.Name.toLowerCase().includes(name) ||
      row.Code.toLowerCase().includes(name)
    );
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
    this.dialogTitle = 'Create Role';
    this.dialogSubtitle = 'Create a new role template.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const roleRow: RoleRow = {
      Id: this.dialogId || Date.now(),
      Code: this.dialogCode,
      Name: this.dialogName,
      Remarks: this.dialogRemarks,
      Status: 'Active',
      IsActive: true
    };

    if (this.isEditMode) {
      this.allRows = this.allRows.map((row) => row.Id === roleRow.Id ? { ...roleRow, Status: row.Status, IsActive: row.IsActive } : row);
      this.toast.success('Updated', `${roleRow.Name || this.pageTitle} updated successfully.`);
    } else {
      this.allRows = [...this.allRows, roleRow];
      this.toast.success('Saved', `${roleRow.Name || this.pageTitle} saved successfully.`);
    }

    this.tableRows = [...this.allRows];
    this.closeAddDialog();
  }

  editRow(row: RoleRow): void {
    this.dialogId = row.Id;
    this.dialogCode = row.Code;
    this.dialogName = row.Name;
    this.dialogRemarks = row.Remarks;
    this.isEditMode = true;
    this.dialogTitle = 'Edit Role';
    this.dialogSubtitle = 'Update the selected role template.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: RoleRow): void {
    this.allRows = this.allRows.filter((x) => x.Id !== row.Id);
    this.tableRows = [...this.allRows];
    this.toast.success('Deleted', `${row.Name || 'Role'} deleted successfully.`);
  }

  activateRow(row: RoleRow): void {
    this.allRows = this.allRows.map((x) =>
      x.Id === row.Id ? { ...x, IsActive: true, Status: 'Active' } : x
    );
    this.tableRows = [...this.allRows];
    this.toast.success('Activated', `${row.Name || 'Role'} activated successfully.`);
  }

  deactivateRow(row: RoleRow): void {
    this.allRows = this.allRows.map((x) =>
      x.Id === row.Id ? { ...x, IsActive: false, Status: 'Inactive' } : x
    );
    this.tableRows = [...this.allRows];
    this.toast.success('Deactivated', `${row.Name || 'Role'} deactivated successfully.`);
  }

  openPermissionsDialog(row: RoleRow): void {
    this.permissionRoleName = row.Name || row.Code || this.pageTitle;
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

  openRowActions(menu: any, event: Event, row: RoleRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: RoleRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${row.Name || 'this role'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: RoleRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: `Are you sure you want to activate ${row.Name || 'this role'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: RoleRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: `Are you sure you want to deactivate ${row.Name || 'this role'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  private getRowActionItems(row: RoleRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Permissions', icon: 'pi pi-lock', styleClass: 'row-action-permissions', command: () => this.handleRowAction('permissions') },
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

  private handleRowAction(action: 'permissions' | 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'permissions') {
      this.openPermissionsDialog(this.selectedRow);
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

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogRemarks = '';
  }
}
