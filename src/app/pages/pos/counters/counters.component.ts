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
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { Counter, CounterService } from '../../../services/counter.service';

type CounterRow = Counter & {
  RowNumber: number;
  Status: string;
  BranchName?: string;
};

const BRANCH_OPTIONS: any[] = [];

const COUNTER_COLUMNS: SharedTableColumn<CounterRow>[] = [
  { field: 'RowNumber', header: '#', sortable: false, width: '5rem' },
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
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
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

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  isLoading = false;
  dialogSubmitted = false;
  dialogSaving = false;

  filterCounterName = '';
  selectedBranchId = 0;

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

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Counters';
  readonly pageSubtitle = 'Maintain restaurant billing and service counters.';
  readonly filterTitle = 'Counters Filters';
  readonly filterDescription = 'API data will be loaded for counters.';
  readonly fields: any[] = [{ key: 'CounterName', label: 'Counter Name', type: 'text', placeholder: 'Main Billing Counter' }];
  readonly primaryActionLabel = 'Search Counters';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Counter';
  dialogSubtitle = 'Create a new restaurant counter.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Counters';
  readonly tableCaption = 'Counters';
  readonly tableColumns = COUNTER_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadBranches();
    this.loadCounter();
  }

  resetForm(): void {
    this.filterCounterName = '';
    this.selectedBranchId = 0;
    this.loadCounter();
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
    this.dialogTitle = 'Create Counter';
    this.dialogSubtitle = 'Create a new Counter for the Branch.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
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

  onBranchChange(branchId: SelectFieldValue): void {
    this.selectedBranchId = Number(branchId || 0);
  }

  searchCounters(): void {
    const searchText = this.filterCounterName.trim().toLowerCase();

    this.tableRows = this.hiddenTableRow.filter((row) =>
      (!this.selectedBranchId || Number(row.BranchId ?? 0) === this.selectedBranchId) &&
      (!searchText ||
        String(row.Name ?? '').toLowerCase().includes(searchText) ||
        String(row.Code ?? '').toLowerCase().includes(searchText))
    );
  }

  loadBranches(): void {
    const orgId = Number(this.userDetails?.OrgId || 0);

    this.branchService.getAll(orgId).subscribe({
      next: (response: any) => {
        const branchList = response?.result ?? [];

        this.branchOptions = branchList.filter((x:any) => x.IsActive == true).map((branch: any) => ({
          label: branch.Name ?? '',
          value: branch.Id ?? 0
        }));
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
  }

  loadCounter(): void {
    this.isLoading = true;

    const orgId = Number(this.userDetails.OrgId || 0);
    const branchId = Number(this.selectedBranchId || 0);

    this.counterService.getAll(orgId, branchId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;

        this.tableRows = (response.result ?? []).map((counter: any) => ({
          ...counter,
          BranchName: counter.BranchName ?? counter.Branch ?? counter.branchName ?? '',
          RowNumber: rowNumber++,
          Status: counter.IsActive ? 'Active' : 'Inactive'
        }));

        this.hiddenTableRow = [...this.tableRows];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load counters. Please check API and try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async editRow(row: CounterRow): Promise<void> {
    const id = Number(row.Id ?? 0);

    if (id <= 0) {
      this.toast.error('Invalid Id', 'Edit failed');
      return;
    }

    this.resetDialogForm();
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

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    this.dialogCounterCode = '';
    this.dialogCounterName = '';
    this.dialogPhone = '';
    this.dialogBranch = null;
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: CounterRow): MenuItem[] {
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
