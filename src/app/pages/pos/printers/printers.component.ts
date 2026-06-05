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
import {
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent
} from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { BranchService } from '../../../services/branch.service';
import { CounterService } from '../../../services/counter.service';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { Printer, PrinterService } from '../../../services/printer.service';
import { TerminalService } from '../../../services/terminal.service';
import { OrganizationService } from '../../../services/organization.service';
import { TableExportService } from '../../../services/table-export.service';
 
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
  { field: 'OrganizationName', header: 'OrganizationName', sortable: true, width: '14rem' },
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
    MultiSelectFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    ProgressSpinnerModule
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
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizationService = inject(OrganizationService);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  pageLoading = false;
  dialogSubmitted = false;
  dialogSaving = false;
  filterPrinterName = '';
  filterBranch: MultiSelectFieldValue = [];
  filterCounter: MultiSelectFieldValue = [];
  filterTerminal: MultiSelectFieldValue = [];
  OrgId = 0;
  BranchId = 0;
  UserId = 0;

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
  isAdmin = false;
  isBranchSelectionLocked = false;

  branchOptions: SelectOption[] = [];
  filterCounterOptions: SelectOption[] = [];
  filterTerminalOptions: SelectOption[] = [];
  dialogCounterOptions: SelectOption[] = [];
  dialogTerminalOptions: SelectOption[] = [];

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Printers';
  readonly pageSubtitle = 'Maintain billing and kitchen printer mappings.';
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading printers workspace.';
  readonly filterTitle = 'Printers Filters';
  readonly primaryActionLabel = 'Search Printers';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Printer';
  dialogSubtitle = 'Create a new printer configuration for restaurant operations.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Printers';
  readonly tableCaption = 'Printers';
  tableColumns = PRINTER_COLUMNS;
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
   branchEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  printerRights = {
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
    this.UserId = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.BranchId = Number(this.userDetails.BranchId || 0);
    this.isAdmin = this.userDetails.IsAdmin == true || this.userDetails.IsAdmin == 1;
    this.isBranchSelectionLocked = this.userDetails.RoleId !== 1 && this.userDetails.IsAdmin !== true && this.userDetails.IsAdmin !== 1;
    try {
      await this.loadPrinterRights();

      this.tableColumns = PRINTER_COLUMNS.map((x: any) => {
        if (x.field === 'OrganizationName') {
          x.hidden = this.userDetails.RoleId !== 1;
        }

        return x;
      });

      this.loadPrinters();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadPrinterRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.branchEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.printerRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.printerRights.Create;
      this.showDownloadButton = this.printerRights.Download;
      this.showRowActions = this.printerRights.Edit || this.printerRights.Delete || this.printerRights.ActiveInActive || this.printerRights.Print;
    } catch {
      this.printerRights = {
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
      this.toast.error('Rights Load Failed', 'Unable to load printer role rights. Please check and try again.');
    }
  }

  resetForm(): void {
    this.filterPrinterName = '';
    this.filterBranch = this.isBranchSelectionLocked && Number(this.userDetails.BranchId || 0) > 0
      ? [Number(this.userDetails.BranchId)]
      : [];
    this.filterCounter = [];
    this.filterTerminal = [];
    this.filterCounterOptions = [];
    this.filterTerminalOptions = [];
    void this.loadFilterCounters(this.toNumberArray(this.filterBranch));
    this.applyPrinterFilters();
  }

  searchPrinters(): void {
    this.applyPrinterFilters();
  }
  openFilterSidebar(): void {
    this.resetForm();
    if (!this.branchOptions.length) {
      void this.loadBranches();
    }
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

private async loadLatestTableCode(orgId: number): Promise<void> {
    if (!this.branchEntityNo || !orgId) {
      this.dialogPrinterCode = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.branchEntityNo, orgId, this.BranchId));
      
      this.dialogPrinterCode = response?.result ?? '';
    } catch {
      this.dialogPrinterCode = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }



  async openAddDialog(): Promise<void> {
    await this.resetDialogForm();
    if (!this.branchOptions.length) {
      await this.loadBranches();
    }
    this.isEditMode = false;
    this.dialogTitle = 'Create Printer';
    this.dialogSubtitle = 'Create a new printer configuration for restaurant operations.';
    this.dialogPrimaryActionLabel = 'Save';
    await this.loadLatestTableCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
    if (this.isBranchSelectionLocked && Number(this.userDetails.BranchId || 0) > 0) {
      this.dialogBranch = Number(this.userDetails.BranchId);
      await this.loadDialogCounters(Number(this.userDetails.BranchId));
    }

    this.showAddDialog = true;
    this.changeDetector.detectChanges();
  }

  closeAddDialog(): void {
    this.dialogSubmitted = false;
    this.isEditMode = false;
    this.showAddDialog = false;
    void this.resetDialogForm();
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
      OrgId: this.OrgId,
      IsActive: true,
      CreatedBy: this.UserId,
      CreatedDate: new Date().toISOString(),
      UpdatedBy: this.UserId,
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      const response: any = payload.Id
        ? await firstValueFrom(this.printerService.update(payload))
        : await firstValueFrom(this.printerService.create(payload));

      if (response?.ErrorInfo?.Message === true && response?.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
        this.dialogPrinterName = '';
        return;
      }

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success(payload.Id ? 'Updated' : 'Saved', `${payload.Name || this.pageTitle} ${payload.Id ? 'updated' : 'saved'} successfully.`);
        this.closeAddDialog();
        return;
      }

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', response?.ErrorInfo?.Message || 'Unable to save printer.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save printer.');
    } finally {
      this.dialogSaving = false;
    }
  }

  loadPrinters(): void {
    const OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.OrgId;
    const BranchId = this.isAdmin
      ? 0
      : Number(this.userDetails.RoleId || 0) === 1
        ? 0
        : this.BranchId;

    this.printerService
        .getAll(OrgId, BranchId, 0, 0)
        .subscribe({
          next: (response: any) => {
            let RowNumber = 1;

            this.tableRows = (response.result ?? []).map((x: any) => {
              x.RowNumber = RowNumber++;
              x.Status = x.IsActive ? 'Active' : 'Inactive';
              return x;
            });
            this.allRows = [...this.tableRows];
            void this.loadFilterCounters(this.toNumberArray(this.filterBranch));
            this.syncFilterTerminalOptions();
            this.applyPrinterFilters();
            this.pageLoading = false;
            this.changeDetector.detectChanges();
          },
          error: () => {
            this.pageLoading = false;
            this.changeDetector.detectChanges();
            this.toast.error(
              'Load Failed',
              'Unable to load printers. Please check API and try again.'
            );
          }
        });
  }

  async exportPrintersAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.OrgId;
      const BranchId = this.isAdmin ? 0 : Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.BranchId;
      const response: any = await firstValueFrom(this.printerService.getAll(OrgId, BranchId, 0, 0));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Printers`;
      const searchText = this.filterPrinterName.trim().toLowerCase();
      const branchIds = this.toNumberArray(this.filterBranch);
      const counterIds = this.toNumberArray(this.filterCounter);
      const terminalIds = this.toNumberArray(this.filterTerminal);

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.Name?.toLowerCase().includes(searchText) ||
          row.Code?.toLowerCase().includes(searchText);
        const matchesBranch = !branchIds.length || branchIds.includes(Number(row.BranchId || 0));
        const matchesCounter = !counterIds.length || counterIds.includes(Number(row.CounterId || 0));
        const matchesTerminal = !terminalIds.length || terminalIds.includes(Number(row.TerminalId || 0));
        return matchesText && matchesBranch && matchesCounter && matchesTerminal;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No printers are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Printers');
      this.toast.success('Export Ready', 'Printer Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export printers to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportPrintersAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.OrgId;
      const BranchId = this.isAdmin ? 0 : Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.BranchId;
      const response: any = await firstValueFrom(this.printerService.getAll(OrgId, BranchId, 0, 0));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.IsActive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Printers`;
      const searchText = this.filterPrinterName.trim().toLowerCase();
      const branchIds = this.toNumberArray(this.filterBranch);
      const counterIds = this.toNumberArray(this.filterCounter);
      const terminalIds = this.toNumberArray(this.filterTerminal);

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.Name?.toLowerCase().includes(searchText) ||
          row.Code?.toLowerCase().includes(searchText);
        const matchesBranch = !branchIds.length || branchIds.includes(Number(row.BranchId || 0));
        const matchesCounter = !counterIds.length || counterIds.includes(Number(row.CounterId || 0));
        const matchesTerminal = !terminalIds.length || terminalIds.includes(Number(row.TerminalId || 0));
        return matchesText && matchesBranch && matchesCounter && matchesTerminal;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No printers are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Printers', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Printer PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export printers to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async editRow(row: PrinterRow): Promise<void> {
    await this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Printer';
    this.dialogSubtitle = 'Update the selected printer configuration.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      if (!this.branchOptions.length) {
        await this.loadBranches();
      }

      const response: any = await firstValueFrom(this.printerService.getById(row.Id ?? 0));
      const result = response?.result ?? {};
      const printer = Array.isArray(result) ? (result[0] ?? {}) : result;
      const branchId = printer.BranchId ?? printer.branchId ?? row.BranchId ?? null;
      const counterId = printer.CounterId ?? printer.counterId ?? row.CounterId ?? null;
      const terminalId = printer.TerminalId ?? printer.terminalId ?? row.TerminalId ?? null;

      this.dialogId = printer.Id ?? 0;
      this.dialogPrinterCode = printer.Code ?? printer.code ?? row.Code ?? '';
      this.dialogPrinterName = printer.Name ?? printer.name ?? row.Name ?? '';
      this.dialogBranch = branchId;

      if (this.dialogBranch) {
        await this.loadDialogCounters(Number(this.dialogBranch));
      }

      this.dialogCounter = counterId;

      if (this.dialogBranch && this.dialogCounter) {
        await this.loadDialogTerminals(Number(this.dialogBranch), Number(this.dialogCounter));
      }

      this.dialogTerminal = terminalId;
      this.dialogRemarks = printer.Remarks ?? printer.remarks ?? row.Remarks ?? '';
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load printer details. Please check and try again.');
    }
  }

  async deleteRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.delete(row.Id ?? 0));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Delete Failed', response?.ErrorInfo?.Message || `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async activateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, true));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Activation Failed', response?.ErrorInfo?.Message || `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  async deactivateRow(row: PrinterRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.printerService.activeInActive(row.Id ?? 0, false));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadPrinters();
        return;
      }

      this.toast.error('Deactivation Failed', response?.ErrorInfo?.Message || `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${String(row.Name ?? row.Code ?? 'record')}. Please try again.`);
    }
  }

  printRow(row: PrinterRow): void {
    this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Printer')} print will be connected later.`);
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

  async resetDialogForm(keepCode: boolean = false): Promise<void> {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    if (!keepCode) {
      this.dialogPrinterCode = '';
    }
    this.dialogPrinterName = '';
    this.dialogBranch = null;
    this.dialogCounter = null;
    this.dialogTerminal = null;
    this.dialogRemarks = '';
    this.dialogCounterOptions = [];
    this.dialogTerminalOptions = [];
    this.dialogBranch = this.isBranchSelectionLocked && Number(this.userDetails.BranchId || 0) > 0
      ? Number(this.userDetails.BranchId)
      : null;

    if (this.isBranchSelectionLocked && Number(this.userDetails.BranchId || 0) > 0) {
      await this.loadBranches();
      await this.loadDialogCounters(Number(this.userDetails.BranchId || 0));
    }
  }

  private async loadBranches(): Promise<void> {
    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
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
      const response: any = await firstValueFrom(this.counterService.getAll(this.OrgId, branchId));
      this.dialogCounterOptions = this.mapOptions(response?.result ?? []);
      this.changeDetector.detectChanges();
    } catch {
      this.dialogCounterOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }
  private async loadDialogTerminals(branchId: number, counterId: number): Promise<void> {
    try {

      const response: any = await firstValueFrom(this.terminalService.getAll(this.OrgId, branchId, counterId));
      this.dialogTerminalOptions = this.mapOptions(response?.result ?? []);
      this.changeDetector.detectChanges();
    } catch {
      this.dialogTerminalOptions = [];
      this.toast.error('Load Failed', 'Unable to load terminals. Please check and try again.');
    }
  }

  private async loadFilterCounters(branchIds: number[]): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.counterService.getMultiAll(this.OrgId, branchIds));
      const counterList = response?.result ?? [];

      this.filterCounterOptions = counterList
        .filter((item: any) => item?.IsActive !== false && item?.isActive !== false)
        .map((item: any) => ({
          label: this.isAdmin
            ? `${item.Name ?? item.name ?? ''}${item.BranchName ? ` - (Branch: ${item.BranchName})` : item.branchName ? ` - (Branch: ${item.branchName})` : ''}`
            : item.Name ?? item.name ?? '',
          value: item.Id ?? item.id ?? 0
        }));
      this.syncFilterTerminalOptions();
      this.changeDetector.detectChanges();
    } catch {
      this.filterCounterOptions = [];
      this.filterTerminalOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
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
    const items: MenuItem[] = [];

    if (this.printerRights.Edit && row.IsActive === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.printerRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.printerRights.ActiveInActive && row.IsActive === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.printerRights.ActiveInActive && row.IsActive !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.printerRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row) });
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
}

