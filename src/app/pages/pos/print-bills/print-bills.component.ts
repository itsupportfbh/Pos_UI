import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';

const PAYMENT_MODE_OPTIONS: { label: string | number; value: string | number }[] = [];
const STATUS_COLUMN: SharedTableColumn<Record<string, unknown>> = { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } };

@Component({
  selector: 'app-print-bills',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent, DateFieldComponent, ActionButtonsComponent, SharedTableComponent],
  templateUrl: './print-bills.component.html',
  styleUrl: './print-bills.component.css'
})
export class PrintBillsComponent {  readonly formState: Record<string, string | Date | null> = {};
  readonly dialogFormState: Record<string, string | Date | null> = {};
  showAddDialog = false;
  showFilterSidebar = false;
  readonly pageEyebrow = 'Billing';
  readonly pageTitle = 'Print Bills';
  readonly pageSubtitle = 'Review invoices and trigger reprints.';
  readonly paymentModeOptions = PAYMENT_MODE_OPTIONS;
  
  readonly filterTitle = `${'Print Bills'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Print Bills'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'invoiceNo', label: 'Invoice Number', type: 'text', placeholder: 'Search invoice number' }, { key: 'paymentMode', label: 'Payment Mode', type: 'select', placeholder: 'Choose payment mode', options: PAYMENT_MODE_OPTIONS }];
  readonly primaryActionLabel = `Search ${'Print Bills'}`;
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
    readonly showAddNewButton = false;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    readonly showFilterButton = true;

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













