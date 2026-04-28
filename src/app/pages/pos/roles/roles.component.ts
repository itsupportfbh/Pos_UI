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
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Role, RoleService } from '../../../services/role.service';

type PagePermission = {
  pageName: string;
  groupName: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
};

type RoleRow = Role & {
  RowNumber: number;
  Status: string;
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
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  showPermissionsDialog = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  filterRoleName = '';
  permissionRoleName = '';
  permissionSearchText = '';

  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';

  selectedRow: RoleRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: RoleRow[] = [];
  permissionPages: PagePermission[] = [];
  userDetails: any = {};

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

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadRoles();
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
    this.loadRoles();
  }

  searchRoles(): void {
    const name = this.filterRoleName.trim().toLowerCase();

    if (!name) {
      this.loadRoles();
      return;
    }

    this.tableRows = this.tableRows.filter((row) =>
      String(row.Name ?? '').toLowerCase().includes(name) ||
      String(row.Code ?? '').toLowerCase().includes(name)
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
    this.loadRoles();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  loadRoles(): void {
    const orgId = Number(this.userDetails.OrgId || 0);

    this.roleService.getAll(orgId).subscribe({
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
        this.toast.error('Load Failed', 'Unable to load roles. Please check API and try again.');
      }
    });
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: Role = {
      Id: this.dialogId,
      Code: this.dialogCode,
      Name: this.dialogName,
      Remarks: this.dialogRemarks,
      OrgId: Number(this.userDetails.OrgId || 0),
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
        response = await firstValueFrom(this.roleService.create(payload));
      } else {
        response = await firstValueFrom(this.roleService.update(payload));
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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save role.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save role.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: RoleRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Role';
    this.dialogSubtitle = 'Update the selected role template.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.roleService.getById(row.Id ?? 0));
      const role = response.result ?? {};

      this.dialogId = role.Id ?? 0;
      this.dialogCode = role.Code ?? '';
      this.dialogName = role.Name ?? '';
      this.dialogRemarks = role.Remarks ?? '';
    } catch {
      this.toast.error('Load Failed', 'Unable to load role details. Please check and try again.');
    }
  }

  async deleteRow(row: RoleRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.roleService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadRoles();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: RoleRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.roleService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadRoles();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: RoleRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.roleService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadRoles();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
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
    const name = String(row.Name ?? row.Code ?? 'this role');

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

  confirmActivateRow(row: RoleRow): void {
    const name = String(row.Name ?? row.Code ?? 'this role');

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

  confirmDeactivateRow(row: RoleRow): void {
    const name = String(row.Name ?? row.Code ?? 'this role');

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

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogRemarks = '';
  }
}
