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
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { Role, RoleService } from '../../../services/role.service';
import { TableExportService } from '../../../services/table-export.service';
 

type PagePermission = {
  entityNo: number;
  pageName: string;
  groupName: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  ActiveInActive: boolean;
  print: boolean;
  download: boolean;
};

type PagePermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'ActiveInActive' | 'print' | 'download';

type RoleRow = Role & {
  RowNumber: number;
  Status: string;
};


const ROLE_COLUMNS: SharedTableColumn<RoleRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'OrganizationName', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
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

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, MultiSelectFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent, ProgressSpinnerModule],
  providers: [ConfirmationService],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly roleService = inject(RoleService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly organizationService = inject(OrganizationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  showPermissionsDialog = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  pageLoading = false;
  permissionLoading = false;
  permissionSaving = false;
  filterOrganizations: MultiSelectFieldValue = [];
  permissionRoleName = '';
  permissionSearchText = '';
  permissionOrgId = 0;
  permissionRoleId = 0;

  dialogId = 0;
  dialogOrganization: SelectFieldValue = null;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';

  selectedRow: RoleRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: RoleRow[] = [];
  tableRows: RoleRow[] = [];
  permissionPages: PagePermission[] = [];
  organizationOptions: any[] = [];
  userDetails: any = {};
  roleEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  roleRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  readonly pageEyebrow = 'Users & Roles';
  readonly pageTitle = 'Roles';
  readonly pageSubtitle = 'Maintain role master details.';
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading roles workspace.';
  readonly filterTitle = 'Role Filters';
  readonly primaryActionLabel = 'Search Roles';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Role';
  dialogSubtitle = 'Create a new role template.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Roles';
  readonly tableCaption = 'Roles';
  tableColumns = ROLE_COLUMNS;
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
      await this.loadRoleRights();

      this.tableColumns = ROLE_COLUMNS.map((x: any) => {
        if (x.field === 'OrganizationName') {
          x.hidden = this.userDetails.RoleId !== 1;
        }

        return x;
      });

      this.loadRoles();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadRoleRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.roleEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.roleRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.roleRights.Create;
      this.showDownloadButton = this.roleRights.Download;
      this.showRowActions = this.roleRights.View || this.roleRights.Edit || this.roleRights.Delete || this.roleRights.ActiveInActive || this.roleRights.Print;
    } catch {
      this.roleRights = {
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
      this.showRowActions = this.roleRights.View || this.roleRights.Print;
      this.toast.error('Rights Load Failed', 'Unable to load role rights. Please check and try again.');
    }
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

  get isAllPermissionsSelected(): boolean {
    return this.permissionPages.length > 0 &&
      this.permissionPages.every((page) => this.isFullAccess(page));
  }

  resetForm(): void {
    this.filterOrganizations = [];
    this.tableRows = [...this.allRows];
  }

  searchRoles(): void {
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
    this.dialogTitle = 'Create Role';
    this.dialogSubtitle = 'Create a new role template.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.userDetails.RoleId === 1) {
      await this.loadOrganizations();
    } else {
      await this.loadLatestRoleCode(Number(this.userDetails.OrgId || 0));
    }
  }

  closeAddDialog(): void {
    this.loadRoles();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  loadRoles(): void {
    const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);

    this.roleService.getAll(orgId).subscribe({
      next: (response) => {
        let RowNumber = 1;

        this.tableRows = (response.result ?? []).map((x: any) => {
          x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
          x.RowNumber = RowNumber++;
          x.Status = x.IsActive ? 'Active' : 'Inactive';
          return x;
        });
        this.allRows = [...this.tableRows];

        this.pageLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.pageLoading = false;
        this.toast.error('Load Failed', 'Unable to load roles. Please check API and try again.');
        this.changeDetector.detectChanges();
      }
    });
  }

  async exportRolesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const response: any = await firstValueFrom(this.roleService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
        x.RowNumber = RowNumber++;
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Roles`;

      if (this.filterOrganizations.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterOrganizations.includes(Number(row.OrgId || 0))
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No roles are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Roles');
      this.toast.success('Export Ready', 'Role Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export roles to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportRolesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const response: any = await firstValueFrom(this.roleService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.OrganizationName = x.OrganizationName ?? x.OrgName ?? this.getOrganizationName(x.OrgId);
        x.RowNumber = RowNumber++;
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Roles`;

      if (this.filterOrganizations.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterOrganizations.includes(Number(row.OrgId || 0))
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No roles are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Roles', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Role PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export roles to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
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

  public async onDialogOrganizationChange(value: SelectFieldValue): Promise<void> {
    this.dialogOrganization = value;

    if (this.isEditMode) {
      return;
    }

    if (!value || Number(value) === 0) {
      this.dialogCode = '';
      return;
    }

    await this.loadLatestRoleCode(Number(value));
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
      OrgId: this.userDetails.RoleId === 1
        ? Number(this.dialogOrganization || 0)
        : Number(this.userDetails.OrgId || 0),
      IsActive: true,
      CreatedBy: Number(this.userDetails.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails.UserId || 0),
      UpdatedDate: null,
      IsDeleted: false,
      EntityNo: this.roleEntityNo
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
      if (this.userDetails.RoleId === 1) {
        await this.loadOrganizations();
      }

      const response: any = await firstValueFrom(this.roleService.getById(row.Id ?? 0));
      const role = response.result ?? {};

      this.dialogId = role.Id ?? 0;
      this.dialogOrganization = role.OrgId ?? null;
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

  async openPermissionsDialog(row: RoleRow): Promise<void> {
    this.permissionRoleName = row.Name || row.Code || this.pageTitle;
    this.permissionSearchText = '';
    this.permissionOrgId = Number(row.OrgId || 0);
    this.permissionRoleId = Number(row.Id || 0);
    this.showPermissionsDialog = true;

    await this.loadPermissionPages();
  }

  closePermissionsDialog(): void {
    this.showPermissionsDialog = false;
    this.permissionLoading = false;
    this.permissionSaving = false;
    this.permissionOrgId = 0;
    this.permissionRoleId = 0;
    this.permissionPages = [];
  }

  async savePermissionsDialog(): Promise<void> {
    if (!this.permissionPages.length) {
      this.toast.warn('No Permissions', 'No permission rows are available to save.');
      return;
    }

    this.permissionSaving = true;

    const payload = this.permissionPages.map((page) => ({
      OrgId: this.permissionOrgId,
      RoleId: this.permissionRoleId,
      EntityNo: page.entityNo,
      Create: page.add,
      Edit: page.edit,
      Delete: page.delete,
      ActiveInActive: page.ActiveInActive,
      View: page.view,
      Download: page.download,
      Print: page.print,
      CreatedBy: Number(this.userDetails.UserId || 0),
      UpdatedBy: Number(this.userDetails.UserId || 0)
    }));

    try {
      const response: any = await firstValueFrom(this.entityMasterService.SaveRolePermission(payload));

      if (response?.ErrorInfo?.Message === true || response?.result === 'Success') {
        this.toast.success('Permissions Saved', `${this.permissionRoleName || 'Role'} permissions saved successfully.`);
        this.closePermissionsDialog();
        return;
      }

      this.toast.error('Save Failed', response?.ErrorInfo?.Message || 'Unable to save role permissions.');
    } catch {
      this.toast.error('Save Failed', 'Unable to save role permissions.');
    } finally {
      this.permissionSaving = false;
    }
  }

  clearPermissionsDialog(): void {
    this.permissionSearchText = '';
    this.permissionPages = this.permissionPages.map((page) => ({
      ...page,
      view: false,
      add: false,
      edit: false,
      delete: false,
      ActiveInActive: false,
      print: false,
      download: false
    }));
  }

  toggleAllPermissions(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.permissionPages = this.permissionPages.map((page) => ({
      ...page,
      view: checked,
      add: checked,
      edit: checked,
      delete: checked,
      ActiveInActive: checked,
      print: checked,
      download: checked
    }));
  }

  setPagePermission(page: PagePermission, permission: PagePermissionAction, event: Event): void {
    page[permission] = (event.target as HTMLInputElement).checked;
  }

  setAllPagePermissions(page: PagePermission, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    page.view = checked;
    page.add = checked;
    page.edit = checked;
    page.delete = checked;
    page.ActiveInActive = checked;
    page.print = checked;
    page.download = checked;
  }

  isFullAccess(page: PagePermission): boolean {
    return page.view && page.add && page.edit && page.delete && page.ActiveInActive && page.print && page.download;
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

  printRow(row: RoleRow): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Role')} print will be connected later.`);
  }

  private getRowActionItems(row: RoleRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.roleRights.View) {
      items.push({ label: 'Permissions', icon: 'pi pi-lock', styleClass: 'row-action-permissions', command: () => this.handleRowAction('permissions') });
    }

    if (this.roleRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.roleRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.roleRights.ActiveInActive && row.IsActive === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.roleRights.ActiveInActive && row.IsActive !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.roleRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row) });
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
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getOrganizationName(orgId: number | string | undefined): string {
    const organization = this.organizationOptions.find((x: any) => Number(x.value || 0) === Number(orgId || 0));
    return organization?.label ?? '';
  }

  private async loadPermissionPages(): Promise<void> {
    if (!this.permissionOrgId || !this.permissionRoleId) {
      this.permissionPages = [];
      return;
    }

    this.permissionLoading = true;
    this.permissionPages = [];

    try {
      const response: any = await firstValueFrom(
        this.entityMasterService.GetEntityMasterForRoleRights(this.permissionOrgId, this.permissionRoleId)
      );
      const permissionRows = response?.result ?? [];

      this.permissionPages = permissionRows.map((x: any) => ({
        entityNo: Number(x.EntityNo || 0),
        groupName: x.MenuName ?? '',
        pageName: x.EntityName ?? x.SubMenuName ?? '',
        view: x.View ?? false, 
        add: x.Create ?? false,
        edit: x.Edit ?? false,
        delete: x.Delete ?? false,
        ActiveInActive: x.ActiveInActive,
        print: x.Print ?? false,
        download: x.Download ?? false
      }));
    } catch {
      this.permissionPages = [];
      this.toast.error('Load Failed', 'Unable to load role permissions. Please check and try again.');
    } finally {
      this.permissionLoading = false;
    }
  }

  private async loadLatestRoleCode(orgId: number): Promise<void> {
      if (!this.roleEntityNo || !orgId) {
        this.dialogCode = '';
        return;
      }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.roleEntityNo, orgId, 0));

      this.dialogCode = response?.result ?? '';
    } catch {
      this.dialogCode = '';
      this.toast.error('Load Failed', 'Unable to load role code. Please check and try again.');
    }
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
    this.dialogRemarks = '';
  }
}
