import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { EntityMasterService } from '../../../services/entitymaster.service';

const PAYMENT_MODE_OPTIONS: { label: string | number; value: string | number }[] = [];
const STATUS_COLUMN: SharedTableColumn<Record<string, unknown>> = { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } };

@Component({
  selector: 'app-print-bills',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent, DateFieldComponent, ActionButtonsComponent, SharedTableComponent],
  templateUrl: './print-bills.component.html',
  styleUrl: './print-bills.component.css'
})
export class PrintBillsComponent {
  private readonly toast = inject(AppToastService);
  private readonly entityMasterService = inject(EntityMasterService);
  readonly formState: Record<string, string | Date | null> = {};
  readonly dialogFormState: Record<string, string | Date | null> = {};
  showAddDialog = false;
  showFilterSidebar = false;
  userDetails: any = {};
  printBillsEntityNo = Number(sessionStorage.getItem('currentMenuEntityNo') || 0);
  printBillsRights = {
    View: true,
    Create: false,
    Edit: false,
    Delete: false,
    ActiveInActive: false,
    Print: true,
    Download: true
  };
  readonly pageEyebrow = 'Billing';
  readonly pageTitle = 'Print Bills';
  readonly pageSubtitle = 'Find completed bills quickly and reprint them when guests need another copy.';
  readonly paymentModeOptions = PAYMENT_MODE_OPTIONS;
  
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly filterDescription = 'API data will be loaded for ' + this.pageTitle.toLowerCase() + '.';
  readonly fields: any[] = [{ key: 'invoiceNo', label: 'Invoice Number', type: 'text', placeholder: 'Search invoice number' }, { key: 'paymentMode', label: 'Payment Mode', type: 'select', placeholder: 'Choose payment mode', options: PAYMENT_MODE_OPTIONS }];
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = '';
  readonly dialogSubtitle = '';
  readonly dialogFields: any[] = [];
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Print Bills';
  readonly tableCaption = 'Print Bills';
  readonly tableColumns: SharedTableColumn<Record<string, unknown>>[] = [
    { field: 'invoiceNo', header: 'Invoice', sortable: true, width: '10rem' },
    { field: 'payment', header: 'Payment', sortable: true, width: '10rem' },
    { field: 'total', header: 'Total', sortable: true, width: '10rem' },
    STATUS_COLUMN
  ];
  tableRows: Record<string, unknown>[] = [];
  showAddNewButton = false;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  showDownloadButton = true;

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.loadPrintBillsRights();
  }

  async loadPrintBillsRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.printBillsEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.printBillsRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = false;
      this.showDownloadButton = this.printBillsRights.Download;
    } catch {
      this.printBillsRights = {
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
      this.toast.error('Rights Load Failed', 'Unable to load print bills role rights. Please check and try again.');
    }
  }

  getFieldValue(fieldKey: string): string | Date | null {
    return this.formState[fieldKey] ?? null;
  }

  setFieldValue(fieldKey: string, value: string | Date | null): void {
    this.formState[fieldKey] = value;
  }

    get filterInvoiceNo(): string {
    return String(this.getFieldValue('invoiceNo') ?? '');
  }
  set filterInvoiceNo(value: string) {
    this.setFieldValue('invoiceNo', value);
  }
  get filterPaymentMode(): string | null {
    const value = this.getFieldValue('paymentMode');
    return typeof value === 'string' ? value : null;
  }
  set filterPaymentMode(value: string | null) {
    this.setFieldValue('paymentMode', value);
  }getDialogFieldValue(fieldKey: string): string | Date | null {
    return this.dialogFormState[fieldKey] ?? null;
  }

  setDialogFieldValue(fieldKey: string, value: string | Date | null): void {
    this.dialogFormState[fieldKey] = value;
  }

  resetForm(): void {
    this.resetState(this.formState, this.fields);
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
    if (!this.showAddNewButton) {
      return;
    }

    this.resetState(this.dialogFormState, this.dialogFields);
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.closeAddDialog();
  }

  trackByField(_: number, field: any): string {
    return field.key;
  }

  private resetState(state: Record<string, string | Date | null>, fields: any[]): void {
    for (const key of Object.keys(state)) {
      delete state[key];
    }

    for (const field of fields) {
      state[field.key] = null;
    }
  }
}
















