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
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { BranchService } from '../../../services/branch.service';
import { Counter, CounterService } from '../../../services/counter.service';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { TableExportService } from '../../../services/table-export.service';
 
type CounterRow = Counter & {
  RowNumber: number;
  Status: string;
  BranchName?: string;
};

const BRANCH_OPTIONS: any[] = [];

const COUNTER_COLUMNS: SharedTableColumn<CounterRow>[] = [
  { field: 'RowNumber', header: '#', sortable: false, width: '5rem' },
  { field: 'OrganizationName', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'BranchName', header: 'Branch', sortable: true, width: '16rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '9rem' }
];

@Component({
  selector: 'app-counters',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    MultiSelectFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    ProgressSpinnerModule
  ],
  providers: [ConfirmationService],
  templateUrl: './counters.component.html',
  styleUrl: './counters.component.css'
})
export class CountersComponent implements OnInit {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly counterService = inject(CounterService);
  private readonly branchService = inject(BranchService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly organizationService = inject(OrganizationService);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  pageLoading = false;
  OrgId = 0;
  BranchId = 0;

  selectedBranchIds: MultiSelectFieldValue = [];

  dialogId = 0;
  dialogCounterCode = '';
  dialogCounterName = '';
  dialogPhone = '';
  dialogBranch: SelectFieldValue = null;
  dialogRemarks = '';

  selectedRow: CounterRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: CounterRow[] = [];
  hiddenTableRow: CounterRow[] = [];
  userDetails: any = {};
  branchOptions = BRANCH_OPTIONS;
  public isBranchSelectionLocked = false;
  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Counters';
  readonly pageSubtitle = 'Maintain restaurant billing and service counters.';
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading counters workspace.';
  readonly filterTitle = 'Counters Filters';
  readonly primaryActionLabel = 'Search Counters';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Counter';
  dialogSubtitle = 'Create a new restaurant counter.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Counters';
  readonly tableCaption = 'Counters';
  tableColumns = COUNTER_COLUMNS;
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  branchEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  counterRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';

  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.BranchId = Number(this.userDetails.BranchId || 0);
    this.isBranchSelectionLocked = this.userDetails.RoleId !== 1 && this.userDetails.IsAdmin !== true && this.userDetails.IsAdmin !== 1;
    try {
      await this.loadCounterRights();
      this.tableColumns = COUNTER_COLUMNS.map((x: any) => {
        if (x.field === 'OrganizationName') {
          x.hidden = this.userDetails.RoleId !== 1;
        }

        return x;
      });

      this.loadCounter();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadCounterRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.branchEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.counterRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.counterRights.Create;
      this.showDownloadButton = this.counterRights.Download;
      this.showRowActions = this.counterRights.Edit || this.counterRights.Delete || this.counterRights.ActiveInActive || this.counterRights.Print;
    } catch {
      this.counterRights = {
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
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load counter role rights. Please check and try again.');
    }
  }

  resetForm(): void {

    this.selectedBranchIds = [];
    this.loadCounter();
  }

  openFilterSidebar(): void {
    this.resetForm();
    if (!this.branchOptions.length) {
      this.loadBranches();
    }
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  private async loadLatestTableCode(orgId: number): Promise<void> {
    if (!this.branchEntityNo || !orgId) {
      this.dialogCounterCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.branchEntityNo, orgId, this.BranchId));

      this.dialogCounterCode = response?.result ?? '';
    } catch {
      this.dialogCounterCode = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }
  async openAddDialog(): Promise<void> {
    await this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Counter';
    this.dialogSubtitle = 'Create a new Counter for the Branch.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
    await this.loadLatestTableCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
    if (!this.isBranchSelectionLocked) {
      this.loadBranches();
    }
  }

  closeAddDialog(): void {
    this.loadCounter();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async submitAddCounter(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: Counter = {
      Id: this.dialogId,
      Code: this.dialogCounterCode.trim(),
      Name: this.dialogCounterName.trim(),
      Phone: this.dialogPhone?.trim() || '',
      BranchId: Number(this.dialogBranch || 0),
      Remarks: this.dialogRemarks?.trim() || '',
      OrgId: Number(this.userDetails?.OrgId || 0),
      IsActive: true,
      CreatedBy: Number(this.userDetails?.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails?.UserId || 0),
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      let response: any;

      if (!payload.Id) {
        response = await firstValueFrom(this.counterService.create(payload));
      } else {
        response = await firstValueFrom(this.counterService.update(payload));
      }

      if (response.ErrorInfo.Message === true && response.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogCounterName = '';
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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save counter.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save counter.');
    } finally {
      this.dialogSaving = false;
    }
  }

  onBranchChange(branchIds: MultiSelectFieldValue): void {
    this.selectedBranchIds = Array.isArray(branchIds) ? branchIds.map((id) => Number(id)) : [];
  }

  searchCounters(): void {
    const selectedBranchIds = this.selectedBranchIds.map((id) => Number(id));

    this.tableRows = this.hiddenTableRow.filter((row) =>
      !selectedBranchIds.length || selectedBranchIds.includes(Number(row.BranchId ?? 0))
    );
  }

  loadBranches(): void {
    const orgId = Number(this.userDetails?.OrgId || 0);

    this.branchService.getAll(orgId).subscribe({
      next: (response: any) => {
        const branchList = response?.result ?? [];

        this.branchOptions = branchList.filter((x: any) => x.IsActive == true).map((branch: any) => ({
          label: branch.Name ?? '',
          value: branch.Id ?? 0
        }));
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.branchOptions = [];
        this.toast.error('Load Failed', 'Unable to load branches. Please check API and try again.');
      }
    });
  }

  private async ensureBranchOptionsLoaded(): Promise<void> {
    if (this.branchOptions.length > 0) {
      return;
    }

    const orgId = Number(this.userDetails?.OrgId || 0);
    const response: any = await firstValueFrom(this.branchService.getAll(orgId));
    const branchList = response?.result ?? [];

    this.branchOptions = branchList.map((branch: any) => ({
      label: branch.Name ?? '',
      value: branch.Id ?? 0
    }));
    this.changeDetector.detectChanges();
  }

  loadCounter(): void {
    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);

    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.counterService.getAll(this.OrgId, this.BranchId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;

        this.tableRows = (response.result ?? []).map((x: any) => {
          const isActive = x.IsActive ?? x.isActive ?? x.isactive ?? false;

          return {
            ...x,
            RowNumber: rowNumber++,
            BranchName: x.BranchName ?? x.Branch ?? x.branchName ?? '',
            IsActive: isActive,
            Status: isActive ? 'Active' : 'Inactive'
          };
        });

        this.hiddenTableRow = [...this.tableRows];
        this.pageLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.pageLoading = false;
        this.toast.error('Load Failed', 'Unable to load counters. Please check API and try again.');
        this.changeDetector.detectChanges();
      }
    });
  }

  async exportCountersAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const branchId = Number(this.userDetails.IsAdmin || 0) === 1
        ? 0
        : Number(this.userDetails.RoleId || 0) === 1
          ? 0
          : Number(this.userDetails.BranchId || 0);

      const response: any = this.selectedBranchIds.length
        ? await firstValueFrom(this.counterService.getMultiAll(orgId, this.selectedBranchIds.map((id) => Number(id))))
        : await firstValueFrom(this.counterService.getAll(orgId, branchId));

      let rowNumber = 1;
      const exportRows = (response?.result ?? []).map((x: any) => {
        const isActive = x.IsActive ?? x.isActive ?? x.isactive ?? false;

        return {
          ...x,
          RowNumber: rowNumber++,
          BranchName: x.BranchName ?? x.Branch ?? x.branchName ?? '',
          IsActive: isActive,
          Status: isActive ? 'Active' : 'Inactive'
        };
      });

      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Counters`;

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No counters are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Counters');
      this.toast.success('Export Ready', 'Counter Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export counters to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportCountersAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const branchId = Number(this.userDetails.IsAdmin || 0) === 1
        ? 0
        : Number(this.userDetails.RoleId || 0) === 1
          ? 0
          : Number(this.userDetails.BranchId || 0);

      const response: any = this.selectedBranchIds.length
        ? await firstValueFrom(this.counterService.getMultiAll(orgId, this.selectedBranchIds.map((id) => Number(id))))
        : await firstValueFrom(this.counterService.getAll(orgId, branchId));

      let rowNumber = 1;
      const exportRows = (response?.result ?? []).map((x: any) => {
        const isActive = x.IsActive ?? x.isActive ?? x.isactive ?? false;

        return {
          ...x,
          RowNumber: rowNumber++,
          BranchName: x.BranchName ?? x.Branch ?? x.branchName ?? '',
          IsActive: isActive,
          Status: isActive ? 'Active' : 'Inactive'
        };
      });

      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Counters`;

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No counters are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Counters', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Counter PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export counters to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async editRow(row: CounterRow): Promise<void> {
    const id = Number(row.Id ?? 0);

    if (id <= 0) {
      this.toast.error('Invalid Id', 'Edit failed');
      return;
    }

    await this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Counter';
    this.dialogSubtitle = 'Update the selected counter details.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      await this.ensureBranchOptionsLoaded();

      const response: any = await firstValueFrom(this.counterService.getById(id));
      const result = response.result ?? {};
      const counter = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = counter.Id ?? 0;
      this.dialogCounterCode = counter.Code ?? '';
      this.dialogCounterName = counter.Name ?? '';
      this.dialogPhone = counter.Phone ?? '';
      this.dialogBranch = counter.BranchId ?? null;
      this.dialogRemarks = counter.Remarks ?? '';
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }

  async deleteRow(row: CounterRow): Promise<void> {
    try {
      const id = Number(row.Id ?? 0);

      if (id <= 0) {
        this.toast.error('Delete Failed', 'Invalid counter id.');
        return;
      }

      const response: any = await firstValueFrom(this.counterService.delete(id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadCounter();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: CounterRow): Promise<void> {
    try {
      const id = Number(row.Id ?? 0);

      if (id <= 0) {
        this.toast.error('Activation Failed', 'Invalid counter id.');
        return;
      }

      const response: any = await firstValueFrom(this.counterService.activeInActive(id, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadCounter();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: CounterRow): Promise<void> {
    try {
      const id = Number(row.Id ?? 0);

      if (id <= 0) {
        this.toast.error('Deactivation Failed', 'Invalid counter id.');
        return;
      }

      const response: any = await firstValueFrom(this.counterService.activeInActive(id, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadCounter();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  printRow(row: CounterRow): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Counter')} print will be connected later.`);
  }

  openRowActions(menu: any, event: Event, row: CounterRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: CounterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this counter');

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

  confirmActivateRow(row: CounterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this counter');

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

  confirmDeactivateRow(row: CounterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this counter');

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

  async resetDialogForm(keepCode: boolean = false): Promise<void> {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    if (!keepCode) {
      this.dialogCounterCode = '';
    }
    this.dialogCounterName = '';
    this.dialogPhone = '';
    this.dialogBranch = null;
    this.dialogRemarks = '';

    if (this.isBranchSelectionLocked) {
      this.loadBranches();
      this.dialogBranch = Number(this.userDetails?.BranchId || 0);
    }
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: CounterRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.counterRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.counterRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.counterRights.ActiveInActive && row.IsActive === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.counterRights.ActiveInActive && row.IsActive !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.counterRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row) });
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

