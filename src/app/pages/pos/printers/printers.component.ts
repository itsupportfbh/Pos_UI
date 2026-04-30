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
import { CounterService } from '../../../services/counter.service';
import { Printer, PrinterService } from '../../../services/printer.service';
import { TerminalService } from '../../../services/terminal.service';

type SelectOption = { label: string | number; value: string | number };

type PrinterRow = Printer & {
  RowNumber: number;
  BranchName: string;
  CounterName: string;
  TerminalName: string;
  Status: string;
};

const PRINTER_COLUMNS: SharedTableColumn<PrinterRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '9rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'OrganizationName', header: 'OrganizationName', sortable: true, width: '14rem' },
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
    MultiSelectFieldComponent,
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
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  isLoading = false;
  dialogSubmitted = false;
  dialogSaving = false;
  filterPrinterName = '';
  filterBranch: MultiSelectFieldValue = [];
  filterCounter: MultiSelectFieldValue = [];
  filterTerminal: MultiSelectFieldValue = [];

  dialogId = 0;
  dialogPrinterCode = '';
  dialogPrinterName = '';
  dialogBranch: SelectFieldValue = null;
  dialogCounter: SelectFieldValue = null;
  dialogTerminal: SelectFieldValue = null;
  dialogRemarks = '';
  hiddenTableRow: PrinterRow[] = [];

  selectedRow: PrinterRow | null = null;
  rowActionItems: MenuItem[] = [];
  tableRows: PrinterRow[] = [];
  allRows: PrinterRow[] = [];
  userDetails: any = {};

  branchOptions: SelectOption[] = [];
  filterCounterOptions: SelectOption[] = [];
  filterTerminalOptions: SelectOption[] = [];
  dialogCounterOptions: SelectOption[] = [];
  dialogTerminalOptions: SelectOption[] = [];

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

    this.loadPrinters();
  }

  resetForm(): void {
    this.filterPrinterName = '';
    this.filterBranch = [];
    this.filterCounter = [];
    this.filterTerminal = [];
    this.filterCounterOptions = [];
    this.filterTerminalOptions = [];
    void this.loadFilterCounters([]);
    this.applyPrinterFilters();
  }

  searchPrinters(): void {
    this.applyPrinterFilters();
  }
  openFilterSidebar(): void {
    if (!this.branchOptions.length) {
      this.loadBranches();
    }
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    await this.ensureBranchOptionsLoaded();
    this.isEditMode = false;
    this.dialogTitle = 'Create Printer';
    this.dialogSubtitle = 'Create a new printer configuration for restaurant operations.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
    this.changeDetector.detectChanges();
  }

  closeAddDialog(): void {
    this.dialogSubmitted = false;
    this.isEditMode = false;
    this.showAddDialog = false;
    this.resetDialogForm();
    this.loadPrinters();
  }

  async onFilterBranchChange(value: MultiSelectFieldValue): Promise<void> {
    this.filterBranch = this.toNumberArray(value);
    this.filterCounter = [];
    this.filterTerminal = [];
    this.filterCounterOptions = [];
    this.filterTerminalOptions = [];

    await this.loadFilterCounters(this.filterBranch.map((id) => Number(id)));
  }

  onFilterCounterChange(value: MultiSelectFieldValue): void {
    this.filterCounter = this.toNumberArray(value);
    this.filterTerminal = [];
    this.syncFilterTerminalOptions();
  }

  onFilterTerminalChange(value: MultiSelectFieldValue): void {
    this.filterTerminal = this.toNumberArray(value);
  }

  async onDialogBranchChange(value: SelectFieldValue): Promise<void> {
    this.dialogBranch = value;
    this.dialogCounter = null;
    this.dialogTerminal = null;
    this.dialogCounterOptions = [];
    this.dialogTerminalOptions = [];

    const branchId = Number(value || 0);

    if (branchId > 0) {
      await this.loadDialogCounters(branchId);
    }

    this.changeDetector.detectChanges();
  }

  async onDialogCounterChange(value: SelectFieldValue): Promise<void> {
    this.dialogCounter = value;
    this.dialogTerminal = null;
    this.dialogTerminalOptions = [];

    const branchId = Number(this.dialogBranch || 0);
    const counterId = Number(value || 0);

    if (branchId > 0 && counterId > 0) {
      await this.loadDialogTerminals(branchId, counterId);
    }

    this.changeDetector.detectChanges();
  }

  async submitAddDialog(): Promise<void> {
    debugger
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
      OrgId: this.userDetails.OrgId,
      IsActive: true,
      CreatedBy: this.getUserId(),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: this.getUserId(),
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      const response: any = payload.Id
        ? await firstValueFrom(this.printerService.update(payload))
        : await firstValueFrom(this.printerService.create(payload));

      if (this.isAlreadyExistsResponse(response)) {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogPrinterName = '';
        return;
      }

      if (this.isSuccessResponse(response)) {
        this.toast.success(payload.Id ? 'Updated' : 'Saved', `${payload.Name || this.pageTitle} ${payload.Id ? 'updated' : 'saved'} successfully.`);
        this.closeAddDialog();
        return;
      }

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', this.getErrorMessage(response, 'Unable to save printer.'));
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save printer.');
    } finally {
      this.dialogSaving = false;
    }
  }

  loadPrinters(): void {
    this.isLoading = true;

    const OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);

    const BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.printerService
      .getAll(OrgId, BranchId, 0, 0)
      .subscribe({
        next: (response: any) => {
          const result = response?.result ?? response ?? [];
          console.log('Printers loaded:', result);

          let RowNumber = 1;

          this.allRows = result.map((x: any) => ({
            ...x,
            Id: x.Id ?? x.id ?? 0,
            BranchId: x.BranchId ?? x.branchId ?? 0,
            CounterId: x.CounterId ?? x.counterId ?? 0,
            TerminalId: x.TerminalId ?? x.terminalId ?? 0,
            BranchName: x.BranchName ?? x.branchName ?? '',
            OrganizationName: x.OrganizationName ?? x.organizationName ?? '',
            CounterName: x.CounterName ?? x.counterName ?? '',
            TerminalName: x.TerminalName ?? x.terminalName ?? '',
            Code: x.Code ?? x.code ?? '',
            Name: x.Name ?? x.name ?? '',
            IsActive: x.IsActive ?? x.isActive ?? false,
            RowNumber: RowNumber++,
            Status: (x.IsActive ?? x.isActive) ? 'Active' : 'Inactive'
          }));
          this.tableRows = [...this.allRows];
          this.hiddenTableRow = [...this.allRows];
          void this.loadFilterCounters(this.toNumberArray(this.filterBranch));
          this.syncFilterTerminalOptions();
          this.applyPrinterFilters();
          this.changeDetector.detectChanges();
        },
        error: () => {
          this.toast.error(
            'Load Failed',
            'Unable to load printers. Please check API and try again.'
          );
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
      await this.ensureBranchOptionsLoaded();

      const response: any = await firstValueFrom(this.printerService.getById(row.Id ?? 0));
      const result = response?.result ?? {};
      const printer = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = printer.Id ?? 0;
      this.dialogPrinterCode = printer.Code ?? '';
      this.dialogPrinterName = printer.Name ?? '';
      this.dialogBranch = printer.BranchId ?? null;

      if (this.dialogBranch) {
        await this.loadDialogCounters(Number(this.dialogBranch));
      }

      this.dialogCounter = printer.CounterId ?? null;

      if (this.dialogBranch && this.dialogCounter) {
        await this.loadDialogTerminals(Number(this.dialogBranch), Number(this.dialogCounter));
      }

      this.dialogTerminal = printer.TerminalId ?? null;
      this.dialogRemarks = printer.Remarks ?? '';
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load printer details. Please check and try again.');
    }
  }

  async deleteRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.delete(row.Id ?? 0));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Delete Failed', this.getErrorMessage(response, `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`));
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, true));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Activation Failed', this.getErrorMessage(response, `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`));
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, false));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Deactivation Failed', this.getErrorMessage(response, `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`));
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
        void this.deleteRow(row);
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
        void this.activateRow(row);
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
        void this.deactivateRow(row);
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
    this.dialogCounterOptions = [];
    this.dialogTerminalOptions = [];
  }

  private async loadBranches(): Promise<void> {
    try {

      const response: any = await firstValueFrom(this.branchService.getAll(this.userDetails.OrgId));
      const branchList = response?.result ?? [];
      this.branchOptions = this.mapOptions(branchList);
      this.changeDetector.detectChanges();
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }


  private async loadDialogCounters(branchId: number): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.counterService.getAll(this.userDetails.OrgId, branchId));
      this.dialogCounterOptions = this.mapOptions(response?.result ?? []);
      this.changeDetector.detectChanges();
    } catch {
      this.dialogCounterOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }
  private async loadDialogTerminals(branchId: number, counterId: number): Promise<void> {
    try {

      const response: any = await firstValueFrom(this.terminalService.getAll(this.userDetails.OrgId, branchId, counterId));
      this.dialogTerminalOptions = this.mapOptions(response?.result ?? []);
      this.changeDetector.detectChanges();
    } catch {
      this.dialogTerminalOptions = [];
      this.toast.error('Load Failed', 'Unable to load terminals. Please check and try again.');
    }
  }

  private async loadFilterCounters(branchIds: number[]): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.counterService.getMultiAll(this.userDetails.OrgId, branchIds));
      this.filterCounterOptions = this.mapOptions(response?.result ?? []);
      this.syncFilterTerminalOptions();
      this.changeDetector.detectChanges();
    } catch {
      this.filterCounterOptions = [];
      this.filterTerminalOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }

  private async ensureBranchOptionsLoaded(): Promise<void> {
    if (this.branchOptions.length > 0) {
      return;
    }

    await this.loadBranches();
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private applyPrinterFilters(): void {
    const searchText = this.filterPrinterName.trim().toLowerCase();
    const branchIds = this.toNumberArray(this.filterBranch);
    const counterIds = this.toNumberArray(this.filterCounter);
    const terminalIds = this.toNumberArray(this.filterTerminal);

    this.tableRows = this.allRows.filter((row) =>
      (!branchIds.length || branchIds.includes(Number(row.BranchId ?? 0))) &&
      (!counterIds.length || counterIds.includes(Number(row.CounterId ?? 0))) &&
      (!terminalIds.length || terminalIds.includes(Number(row.TerminalId ?? 0))) &&
      (!searchText ||
        String(row.Name ?? '').toLowerCase().includes(searchText) ||
        String(row.Code ?? '').toLowerCase().includes(searchText) ||
        String(row.BranchName ?? '').toLowerCase().includes(searchText) ||
        String(row.CounterName ?? '').toLowerCase().includes(searchText) ||
        String(row.TerminalName ?? '').toLowerCase().includes(searchText))
    );

    this.changeDetector.detectChanges();
  }

  private syncFilterTerminalOptions(): void {
    const branchIds = this.toNumberArray(this.filterBranch);
    const counterIds = this.toNumberArray(this.filterCounter);

    const terminalMap = new Map<number, SelectOption>();

    for (const row of this.allRows) {
      const branchId = Number(row.BranchId ?? 0);
      const counterId = Number(row.CounterId ?? 0);
      const terminalId = Number(row.TerminalId ?? 0);

      if (branchIds.length && !branchIds.includes(branchId)) {
        continue;
      }

      if (counterIds.length && !counterIds.includes(counterId)) {
        continue;
      }

      if (!terminalId || terminalMap.has(terminalId)) {
        continue;
      }

      terminalMap.set(terminalId, {
        label: row.TerminalName ?? terminalId,
        value: terminalId
      });
    }

    this.filterTerminalOptions = Array.from(terminalMap.values()).sort((left, right) =>
      String(left.label).localeCompare(String(right.label))
    );

    this.filterTerminal = this.toNumberArray(this.filterTerminal).filter((id) =>
      this.filterTerminalOptions.some((option) => Number(option.value) === id)
    );
  }

  private toNumberArray(value: MultiSelectFieldValue | SelectFieldValue): number[] {
    const values = Array.isArray(value) ? value : value === null || value === '' ? [] : [value];

    return values
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item) && item > 0);
  }

  private mapOptions(items: any[]): SelectOption[] {
    return items
      .filter((item: any) => item?.IsActive !== false && item?.isActive !== false)
      .map((item: any) => ({
        label: item.Name ?? item.name ?? '',
        value: item.Id ?? item.id ?? 0
      }));
  }

  private getRowActionItems(row: PrinterRow): MenuItem[] {

    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (this.isRowActive(row)) {
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
      void this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }


  private getUserId(): number {
    return Number(this.userDetails?.UserId || 0);
  }

  private isSuccessResponse(response: any): boolean {
    return response?.ErrorInfo?.Message === true;
  }

  private isAlreadyExistsResponse(response: any): boolean {
    return this.isSuccessResponse(response) && response?.result === 'AlreadyExists';
  }

  private getErrorMessage(response: any, fallbackMessage: string): string {
    const message = response?.ErrorInfo?.Message;
    return typeof message === 'string' && message.trim() ? message : fallbackMessage;
  }

  private isRowActive(row: any): boolean {
    return row?.IsActive === true || row?.isActive === true || row?.isactive === true;
  }
}
