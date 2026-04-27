import { CommonModule } from '@angular/common';
import { Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
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
import { CounterService } from '../../../services/counter.service';
import { Printer, PrinterService } from '../../../services/printer.service';
import { TerminalService } from '../../../services/terminal.service';

type PrinterRow = Printer & {
  RowNumber: number;
  BranchName: string;
  CounterName: string;
  TerminalName: string;
  Status: string;
};

const BRANCH_OPTIONS: { label: string | number; value: string | number }[] = [];
const COUNTER_OPTIONS: { label: string | number; value: string | number }[] = [];
const TERMINAL_OPTIONS: { label: string | number; value: string | number }[] = [];

const PRINTER_COLUMNS: SharedTableColumn<PrinterRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'BranchName', header: 'Branch', sortable: true, width: '14rem' },
  { field: 'CounterName', header: 'Counter', sortable: true, width: '14rem' },
  { field: 'TerminalName', header: 'Terminal', sortable: true, width: '14rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-printers',
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
  templateUrl: './printers.component.html',
  styleUrl: './printers.component.css'
})
export class PrintersComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly branchService = inject(BranchService);
  private readonly counterService = inject(CounterService);
  private readonly terminalService = inject(TerminalService);
  private readonly printerService = inject(PrinterService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  isLoading = false;
  dialogSubmitted = false;
  dialogSaving = false;

  filterBranch: SelectFieldValue = null;
  filterCounter: SelectFieldValue = null;
  filterTerminal: SelectFieldValue = null;
  dialogId = 0;
  dialogPrinterCode = '';
  dialogPrinterName = '';
  dialogBranch: SelectFieldValue = null;
  dialogCounter: SelectFieldValue = null;
  dialogTerminal: SelectFieldValue = null;
  dialogRemarks = '';

  selectedRow: PrinterRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: PrinterRow[] = [];
  allRows: PrinterRow[] = [];
  userDetails: any = {};
  branchOptions = BRANCH_OPTIONS;
  counterOptions = COUNTER_OPTIONS;
  terminalOptions = TERMINAL_OPTIONS;

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Printers';
  readonly pageSubtitle = 'Maintain billing and kitchen printer mappings.';
  readonly filterTitle = 'Printers Filters';
  readonly primaryActionLabel = 'Search Printers';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Printer';
  dialogSubtitle = 'Create a new printer configuration for restaurant operations.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Printers';
  readonly tableCaption = 'Printers';
  readonly tableColumns = PRINTER_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    void this.loadBranches();
    void this.loadCounters();
    void this.loadTerminals();
    this.loadPrinters();
  }

  async loadBranches(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      const branchList = response?.result ?? [];

      this.branchOptions = branchList.map((branch: any) => ({
        label: branch.Name ?? '',
        value: branch.Id ?? 0
      }));
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async loadCounters(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const branchId = Number(this.dialogBranch || this.filterBranch || 0);
      const response: any = await firstValueFrom(this.counterService.getAll(orgId, branchId));
      const counterList = response?.result ?? [];

      this.counterOptions = counterList.map((counter: any) => ({
        label: counter.Name ?? '',
        value: counter.Id ?? 0
      }));
    } catch {
      this.counterOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }

  async loadTerminals(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const branchId = Number(this.dialogBranch || this.filterBranch || 0);
      const counterId = Number(this.dialogCounter || this.filterCounter || 0);
      const response: any = await firstValueFrom(this.terminalService.getAll(orgId, branchId, counterId));
      const terminalList = response?.result ?? [];

      this.terminalOptions = terminalList.map((terminal: any) => ({
        label: terminal.Name ?? '',
        value: terminal.Id ?? 0
      }));
    } catch {
      this.terminalOptions = [];
      this.toast.error('Load Failed', 'Unable to load terminals. Please check and try again.');
    }
  }

  resetForm(): void {
    this.filterBranch = null;
    this.filterCounter = null;
    this.filterTerminal = null;
    this.loadPrinters();
  }

  searchPrinters(): void {
    this.loadPrinters();
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
    this.dialogTitle = 'Create Printer';
    this.dialogSubtitle = 'Create a new printer configuration for restaurant operations.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
  }

  async onFilterBranchChange(value: SelectFieldValue): Promise<void> {
    this.filterBranch = value;
    this.filterCounter = null;
    this.filterTerminal = null;
    this.counterOptions = [];
    this.terminalOptions = [];
    await this.loadCounters();
    await this.loadTerminals();
  }

  async onFilterCounterChange(value: SelectFieldValue): Promise<void> {
    this.filterCounter = value;
    this.filterTerminal = null;
    this.terminalOptions = [];
    await this.loadTerminals();
  }

  async onDialogBranchChange(value: SelectFieldValue): Promise<void> {
    this.dialogBranch = value;
    this.dialogCounter = null;
    this.dialogTerminal = null;
    this.counterOptions = [];
    this.terminalOptions = [];
    await this.loadCounters();
    await this.loadTerminals();
  }

  async onDialogCounterChange(value: SelectFieldValue): Promise<void> {
    this.dialogCounter = value;
    this.dialogTerminal = null;
    this.terminalOptions = [];
    await this.loadTerminals();
  }

  closeAddDialog(): void {
    this.loadPrinters();
    this.dialogSubmitted = false;
    this.isEditMode = false;
    this.showAddDialog = false;
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: Printer = {
      Id: this.dialogId,
      Code: this.dialogPrinterCode.trim(),
      Name: this.dialogPrinterName.trim(),
      BranchId: Number(this.dialogBranch || 0),
      CounterId: Number(this.dialogCounter || 0),
      TerminalId: Number(this.dialogTerminal || 0),
      Remarks: this.dialogRemarks.trim(),
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
        response = await firstValueFrom(this.printerService.create(payload));
      } else {
        response = await firstValueFrom(this.printerService.update(payload));
      }

      if (response.ErrorInfo.Message === true && response.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogPrinterName = '';
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

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response.ErrorInfo.Message || 'Unable to save printer.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save printer.');
    } finally {
      this.dialogSaving = false;
    }
  }

  loadPrinters(): void {
    this.isLoading = true;

    const orgId = Number(this.userDetails?.OrgId || 0);
    const branchId = Number(this.filterBranch || 0);
    const counterId = Number(this.filterCounter || 0);
    const terminalId = Number(this.filterTerminal || 0);

    this.printerService.getAll(orgId, branchId, counterId, terminalId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;

        this.allRows = (response.result ?? []).map((printer: any) => ({
          ...printer,
          BranchName: printer.BranchName ?? printer.Branch ?? '',
          CounterName: printer.CounterName ?? printer.Counter ?? '',
          TerminalName: printer.TerminalName ?? printer.Terminal ?? '',
          RowNumber: rowNumber++,
          Status: printer.IsActive ? 'Active' : 'Inactive'
        }));

        this.tableRows = [...this.allRows];
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load printers. Please check API and try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async editRow(row: PrinterRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Printer';
    this.dialogSubtitle = 'Update the selected printer configuration.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.printerService.getById(row.Id ?? 0));
      const result = response.result ?? {};
      const printer = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = printer.Id ?? 0;
      this.dialogPrinterCode = printer.Code ?? '';
      this.dialogPrinterName = printer.Name ?? '';
      this.dialogBranch = printer.BranchId ?? null;
      await this.loadCounters();
      this.dialogCounter = printer.CounterId ?? null;
      await this.loadTerminals();
      this.dialogTerminal = printer.TerminalId ?? null;
      this.dialogRemarks = printer.Remarks ?? '';
    } catch {
      this.toast.error('Load Failed', 'Unable to load printers. Please check and try again.');
    }
  }

  async deleteRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.delete(row.Id ?? 0));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Delete Failed', response.ErrorInfo.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, true));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Activation Failed', response.ErrorInfo.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, false));

      if (response.ErrorInfo.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Deactivation Failed', response.ErrorInfo.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  openRowActions(menu: any, event: Event, row: PrinterRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: PrinterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this printer');

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

  confirmActivateRow(row: PrinterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this printer');

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

  confirmDeactivateRow(row: PrinterRow): void {
    const name = String(row.Name ?? row.Code ?? 'this printer');

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
    this.dialogPrinterCode = '';
    this.dialogPrinterName = '';
    this.dialogBranch = null;
    this.dialogCounter = null;
    this.dialogTerminal = null;
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: PrinterRow): MenuItem[] {
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
