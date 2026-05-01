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
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import {
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent
} from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { Floor, FloorService } from '../../../services/floor.service';
import { OrganizationService } from '../../../services/organization.service';

type FloorRow = Floor & {
  RowNumber: number;
  Status: string;
  OrganizationName?: string;
  BranchName?: string;
};

const FLOOR_COLUMNS: SharedTableColumn<FloorRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'OrganizationName', header: 'Organization', sortable: true, width: '16rem', hidden: true },
  { field: 'BranchName', header: 'Branch', sortable: true, width: '16rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-floor',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    SelectFieldComponent,
    MultiSelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  providers: [ConfirmationService],
  templateUrl: './floor.component.html',
  styleUrl: './floor.component.css'
})
export class FloorComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly floorService = inject(FloorService);
  private readonly branchService = inject(BranchService);
  private readonly organizationService = inject(OrganizationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  isLoading = false;

  filterFloorName = '';
  filterOrganizations: MultiSelectFieldValue = [];
  filterBranches: MultiSelectFieldValue = [];
  selectedRow: FloorRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: FloorRow[] = [];
  allRows: FloorRow[] = [];
  userDetails: any = {};

  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogBranch: SelectFieldValue = null;
  dialogRemarks = '';
  organizationOptions: any[] = [];
  branchOptions: any[] = [];

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Floors';
  readonly pageSubtitle = 'Manage floor master details.';
  readonly filterTitle = 'Floor Filters';
  readonly primaryActionLabel = 'Search Floors';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Floor';
  dialogSubtitle = 'Create a new floor for the branch.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Floors';
  readonly tableCaption = 'Floors';
  tableColumns = FLOOR_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
     this.tableColumns = FLOOR_COLUMNS.map((x: any) => {
      if (x.field === 'OrganizationName') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });
    this.loadFloors();
  }

  loadFloors(): void {
    this.isLoading = true;
    const orgId = Number(this.userDetails?.RoleId || 0) === 1 ? 0 : Number(this.userDetails?.OrgId || 0);
      const BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.BranchId);
    this.floorService.getAll(orgId,BranchId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;
        this.allRows = (response.result ?? []).map((floor: any) => ({
          ...floor,
          Id: floor.Id ?? floor.id ?? 0,
          Code: floor.Code ?? floor.code ?? '',
          Name: floor.Name ?? floor.name ?? '',
          BranchId: floor.BranchId ?? floor.branchId ?? 0,
          OrganizationName: floor.OrganizationName ?? floor.OrganizationName ?? floor.OrganizationName ?? '',
          BranchName: floor.BranchName ?? floor.branchName ?? floor.Branch ?? '',
          OrgId: floor.OrgId ?? floor.orgId ?? 0,
          IsActive: floor.IsActive ?? floor.isActive ?? false,
          RowNumber: rowNumber++,
          Status: (floor.IsActive ?? floor.isActive) ? 'Active' : 'Inactive'
        }));

        this.tableRows = [...this.allRows];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load floors. Please check API and try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  resetForm(): void {
    this.filterFloorName = '';
    this.filterOrganizations = [];
    this.filterBranches = [];
    if (this.userDetails.RoleId === 1) {
      void this.loadAllBranches();
    } else {
      void this.loadBranches(Number(this.userDetails?.OrgId || 0));
    }
    this.applyFloorFilters();
    this.closeFilterSidebar();
  }

  searchFloors(): void {
    this.applyFloorFilters();
    this.closeFilterSidebar();
  }

  onFilterFloorNameChange(value: string): void {
    this.filterFloorName = value;
  }

  async onFilterOrganizationsChange(value: MultiSelectFieldValue): Promise<void> {
    this.filterOrganizations = Array.isArray(value) ? value.map((id) => Number(id)) : [];
    this.filterBranches = [];

    if (!this.filterOrganizations.length) {
      await this.loadAllBranches();
      return;
    }

    await this.loadBranchesForOrganizations(this.filterOrganizations.map((id) => Number(id)));
  }

  onFilterBranchesChange(value: MultiSelectFieldValue): void {
    this.filterBranches = Array.isArray(value) ? value.map((id) => Number(id)) : [];
  }

  openFilterSidebar(): void {
    if (this.userDetails.RoleId === 1 && !this.organizationOptions.length) {
      void this.loadOrganizations();
    }

    if (!this.branchOptions.length) {
      if (this.userDetails.RoleId === 1) {
        void this.loadAllBranches();
      } else {
        void this.loadBranches(Number(this.userDetails?.OrgId || 0));
      }
    }

    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Floor';
    this.dialogSubtitle = 'Create a new floor for the branch.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.userDetails.RoleId === 1) {
      void this.loadAllBranches();
    } else {
      void this.loadBranches(Number(this.userDetails?.OrgId || 0));
    }
  }

  closeAddDialog(): void {
    this.loadFloors();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async loadOrganizations(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      const organizations = response?.result ?? [];

      this.organizationOptions = organizations.map((organization: any) => ({
        label: organization.Name ?? '',
        value: organization.Id ?? 0
      }));
    } catch {
      this.organizationOptions = [];
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  async loadBranches(orgId: number): Promise<void> {
    if (!orgId) {
      this.branchOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      const branches = response?.result ?? [];

      this.branchOptions = branches
        .filter((branch: any) => branch.IsActive === true || branch.isActive === true)
        .map((branch: any) => ({
          label: branch.Name ?? '',
          value: branch.Id ?? 0,
          orgId: branch.OrgId ?? branch.orgId ?? orgId
        }));
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async loadAllBranches(): Promise<void> {
    if (this.userDetails.RoleId !== 1) {
      await this.loadBranches(Number(this.userDetails?.OrgId || 0));
      return;
    }

    if (!this.organizationOptions.length) {
      await this.loadOrganizations();
    }

    const organizationIds = this.organizationOptions.map((option) => Number(option.value || 0)).filter((id) => id > 0);
    await this.loadBranchesForOrganizations(organizationIds);
  }

  async loadBranchesForOrganizations(orgIds: number[]): Promise<void> {
    const uniqueOrgIds = [...new Set(orgIds.map((id) => Number(id)).filter((id) => id > 0))];

    if (!uniqueOrgIds.length) {
      this.branchOptions = [];
      return;
    }

    try {
      const responses = await Promise.all(
        uniqueOrgIds.map((orgId) => firstValueFrom(this.branchService.getAll(orgId)))
      );

      const branchMap = new Map<number, { label: string; value: number; orgId: number }>();

      responses.forEach((response: any) => {
        const branches = response?.result ?? [];
        branches.forEach((branch: any) => {
          const branchId = Number(branch.Id ?? 0);
          if (!branchId || branchMap.has(branchId)) {
            return;
          }

          if (branch.IsActive !== true && branch.isActive !== true) {
            return;
          }

          branchMap.set(branchId, {
            label: branch.Name ?? '',
            value: branchId,
            orgId: Number(branch.OrgId ?? branch.orgId ?? 0)
          });
        });
      });

      this.branchOptions = [...branchMap.values()];
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: Floor = {
      Id: this.dialogId,
      Code: this.dialogCode.trim(),
      Name: this.dialogName.trim(),
      BranchId: Number(this.dialogBranch || 0),
      Remarks: this.dialogRemarks.trim(),
      OrgId: this.resolveDialogOrgId(),
      IsActive: true,
      CreatedBy: Number(this.userDetails?.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails?.UserId || 0),
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      const response: any = payload.Id
        ? await firstValueFrom(this.floorService.update(payload))
        : await firstValueFrom(this.floorService.create(payload));

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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save floor.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save floor.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: FloorRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Floor';
    this.dialogSubtitle = 'Update the selected floor details.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.floorService.getById(row.Id ?? 0));
      const result = response.result ?? {};
      const floor = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = floor.Id ?? floor.id ?? 0;
      this.dialogCode = floor.Code ?? floor.code ?? '';
      this.dialogName = floor.Name ?? floor.name ?? '';
      const orgId = Number(floor.OrgId ?? floor.orgId ?? 0);
      if (orgId) {
        if (this.userDetails.RoleId === 1) {
          await this.loadBranchesForOrganizations([orgId]);
        } else {
          await this.loadBranches(orgId);
        }
      }
      this.dialogBranch = floor.BranchId ?? floor.branchId ?? null;
      this.dialogRemarks = floor.Remarks ?? floor.remarks ?? '';
    } catch {
      this.toast.error('Load Failed', 'Unable to load floor details. Please check and try again.');
    }
  }

  async deleteRow(row: FloorRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.floorService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadFloors();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: FloorRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.floorService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadFloors();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: FloorRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.floorService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadFloors();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  openRowActions(menu: any, event: Event, row: FloorRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: FloorRow): void {
    const name = String(row.Name ?? row.Code ?? 'this floor');

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

  confirmActivateRow(row: FloorRow): void {
    const name = String(row.Name ?? row.Code ?? 'this floor');

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

  confirmDeactivateRow(row: FloorRow): void {
    const name = String(row.Name ?? row.Code ?? 'this floor');

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

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogBranch = null;
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
    const areMultiSelectFieldsValid = this.multiSelectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid && areMultiSelectFieldsValid;
  }

  private applyFloorFilters(): void {
    const searchText = this.filterFloorName.trim().toLowerCase();
    const organizationIds = this.filterOrganizations.map((id) => Number(id));
    const branchIds = this.filterBranches.map((id) => Number(id));

    this.tableRows = this.allRows.filter((row) =>
      (!organizationIds.length || organizationIds.includes(Number(row.OrgId ?? 0))) &&
      (!branchIds.length || branchIds.includes(Number(row.BranchId ?? 0))) &&
      (!searchText ||
        String(row.Name ?? '').toLowerCase().includes(searchText) ||
        String(row.Code ?? '').toLowerCase().includes(searchText) ||
        String(row.OrganizationName ?? '').toLowerCase().includes(searchText) ||
        String(row.BranchName ?? '').toLowerCase().includes(searchText) ||
        String(row.Status ?? '').toLowerCase().includes(searchText))
    );

    this.changeDetector.detectChanges();
  }

  private resolveDialogOrgId(): number {
    if (this.userDetails.RoleId !== 1) {
      return Number(this.userDetails?.OrgId || 0);
    }

    const selectedBranchId = Number(this.dialogBranch || 0);
    const selectedBranch = this.branchOptions.find((option: any) => Number(option.value || 0) === selectedBranchId);

    return Number(selectedBranch?.orgId || 0);
  }

  private getRowActionItems(row: FloorRow): MenuItem[] {
    const items: MenuItem[] = [
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
}
