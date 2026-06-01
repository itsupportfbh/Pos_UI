import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { AppToastService } from '../../../services/app-toast.service';
import { OrganizationService } from '../../../services/organization.service';
import { RoleService } from '../../../services/role.service';
import { ReportCatalogService, ReportPermissionSettings } from '../../../services/report-catalog.service';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';

type SelectOption = {
  label: string;
  value: number;
};

type PermissionRow = {
  reportId: number;
  categoryName: string;
  reportName: string;
  displayName: string;
  reportLabel: string;
  canView: boolean;
  canPrint: boolean;
  exportPdf: boolean;
  exportExcel: boolean;
};

@Component({
  selector: 'app-reports-permission',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    SelectFieldComponent,
    TextFieldComponent,
    ActionButtonsComponent,
  ],
  templateUrl: './reports-permission.component.html',
  styleUrls: ['./reports-permission.component.css']
})
export class ReportsPermissionComponent {
  private readonly toast = inject(AppToastService);
  private readonly organizationService = inject(OrganizationService);
  private readonly roleService = inject(RoleService);
  private readonly reportCatalogService = inject(ReportCatalogService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly pageEyebrow = 'Reporting';
  readonly pageTitle = 'Report Permissions';
  readonly pageSubtitle = 'Configure report permissions for role-based report access.';

  userDetails: any = {};
  organizationOptions: SelectOption[] = [];
  roleOptions: SelectOption[] = [];
  permissionRows: PermissionRow[] = [];
  selectedOrgId = 0;
  selectedRoleId = 0;
  showPermissionsDialog = false;
  permissionSearchText = '';

  loadingOrganizations = false;
  loadingRoles = false;
  loadingPermissions = false;
  savingPermissions = false;

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const currentOrgId = Number(this.userDetails?.OrgId || this.userDetails?.OrganizationId || 0);
    if (currentOrgId > 0) {
      this.selectedOrgId = currentOrgId;
    }
    void this.loadOrganizations();
  }

  get selectedRoleLabel(): string {
    return this.roleOptions.find((role) => role.value === this.selectedRoleId)?.label ?? 'selected role';
  }

  get filteredPermissionRows(): PermissionRow[] {
    const searchText = this.permissionSearchText.trim().toLowerCase();
    if (!searchText) {
      return this.permissionRows;
    }

    return this.permissionRows.filter((row) =>
      row.categoryName.toLowerCase().includes(searchText) ||
      row.reportLabel.toLowerCase().includes(searchText) ||
      row.reportName.toLowerCase().includes(searchText)
    );
  }

  get isAllPermissionsSelected(): boolean {
    return this.permissionRows.length > 0 && this.permissionRows.every((row) => this.isFullAccess(row));
  }

  async loadOrganizations(): Promise<void> {
    this.loadingOrganizations = true;

    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      this.organizationOptions = (response?.result ?? []).map((org: any) => ({
        label: String(org.Name ?? org.Code ?? `Organization ${org.Id}`),
        value: Number(org.Id ?? 0)
      }));
    } catch {
      this.organizationOptions = [];
      this.toast.error('Load Failed', 'Unable to load organizations. Please try again.');
    } finally {
      this.loadingOrganizations = false;
      if (this.selectedOrgId && !this.loadingRoles) {
        void this.loadRoles(this.selectedOrgId);
      }
    }
  }

  async onOrganizationChange(orgId: number): Promise<void> {
    this.selectedOrgId = Number(orgId || 0);
    this.selectedRoleId = 0;
    this.roleOptions = [];
    this.permissionRows = [];

    if (this.selectedOrgId) {
      await this.loadRoles(this.selectedOrgId);
    }
  }

  async onRoleChange(roleId: number): Promise<void> {
    this.selectedRoleId = Number(roleId || 0);
    this.permissionRows = [];
  }

  async loadRoles(orgId: number): Promise<void> {
    if (!orgId) {
      this.roleOptions = [];
      return;
    }

    this.loadingRoles = true;

    try {
      const response: any = await firstValueFrom(this.roleService.getAll(orgId));
      this.roleOptions = (response?.result ?? []).map((role: any) => ({
        label: String(role.Name ?? role.Code ?? `Role ${role.Id}`),
        value: Number(role.Id ?? 0)
      }));
    } catch {
      this.roleOptions = [];
      this.toast.error('Load Failed', 'Unable to load roles. Please try again.');
    } finally {
      this.loadingRoles = false;
    }
  }

  async loadReportPermissions(): Promise<void> {
    if (!this.selectedOrgId || !this.selectedRoleId) {
      this.permissionRows = [];
      return;
    }

    this.loadingPermissions = true;
    this.permissionRows = [];

    try {
      const response: any = await firstValueFrom(
        this.reportCatalogService.getReportPermissions(this.selectedOrgId, this.selectedRoleId)
      );

      this.permissionRows = (response?.result ?? []).map((item: any) => ({
        reportId: Number(item.Id ?? 0),
        categoryName: String(item.CategoryName ?? ''),
        reportName: String(item.ReportName ?? item.DisplayName ?? ''),
        displayName: String(item.DisplayName ?? ''),
        reportLabel: String(item.DisplayName ?? item.ReportName ?? ''),
        canView: Boolean(item.CanView),
        canPrint: Boolean(item.CanPrint),
        exportPdf: Boolean(item.ExportPdf),
        exportExcel: Boolean(item.ExportExcel)
      }));
    } catch {
      this.permissionRows = [];
      this.toast.error('Load Failed', 'Unable to load report permissions. Please try again.');
    } finally {
      this.loadingPermissions = false;
      this.changeDetector.detectChanges();
    }
  }

  async saveReportPermissions(): Promise<void> {
    if (!this.selectedOrgId || !this.selectedRoleId) {
      this.toast.warn('Missing Selection', 'Please choose an organization and a role before saving.');
      return;
    }

    if (!this.permissionRows.length) {
      this.toast.warn('No Permissions', 'There are no report permissions to save.');
      return;
    }

    this.savingPermissions = true;

    const payload: ReportPermissionSettings[] = this.permissionRows.map((row) => ({
      OrgId: this.selectedOrgId,
      RoleId: this.selectedRoleId,
      ReportId: row.reportId,
      CanView: row.canView,
      CanPrint: row.canPrint,
      ExportPdf: row.exportPdf,
      ExportExcel: row.exportExcel
    }));

    try {
      const response: any = await firstValueFrom(this.reportCatalogService.saveReportPermissions(payload));

      if (response?.ErrorInfo?.Message === true || response?.result === 'Success') {
        this.toast.success('Saved', 'Report permissions were saved successfully.');
        await this.loadReportPermissions();
        return;
      }

      this.toast.error('Save Failed', response?.ErrorInfo?.Message || 'Unable to save report permissions.');
    } catch {
      this.toast.error('Save Failed', 'Unable to save report permissions.');
    } finally {
      this.savingPermissions = false;
    }
  }

  resetReportPermissions(): void {
    if (this.selectedRoleId && this.selectedOrgId) {
      void this.loadReportPermissions();
    }
  }

  async openPermissionsDialog(): Promise<void> {
    if (!this.selectedOrgId || !this.selectedRoleId) {
      this.toast.warn('Missing Selection', 'Please choose an organization and a role first.');
      return;
    }

    this.permissionSearchText = '';
    await this.loadReportPermissions();
    this.showPermissionsDialog = true;
  }

  closePermissionsDialog(): void {
    this.showPermissionsDialog = false;
    this.permissionSearchText = '';
  }

  toggleAllPermissions(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissionRows = this.permissionRows.map((row) => ({
      ...row,
      canView: checked,
      canPrint: checked,
      exportPdf: checked,
      exportExcel: checked
    }));
  }

  setAllPermissions(row: PermissionRow, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    row.canView = checked;
    row.canPrint = checked;
    row.exportPdf = checked;
    row.exportExcel = checked;
  }

  isFullAccess(row: PermissionRow): boolean {
    return row.canView && row.canPrint && row.exportPdf && row.exportExcel;
  }

  setPermission(
    row: PermissionRow,
    field: keyof Omit<PermissionRow, 'reportId' | 'categoryName' | 'reportName' | 'displayName' | 'reportLabel'>,
    event: Event
  ): void {
    row[field] = (event.target as HTMLInputElement).checked;
  }
}
