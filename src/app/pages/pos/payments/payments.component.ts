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
import { SharedTableComponent } from '../../../components/table/shared-table.component';
import { FeatureFieldConfig, FeaturePageConfig } from '../config/models';

const PAYMENT_MODE_OPTIONS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'Card' },
  { label: 'Credit', value: 'Credit' }
];
const CODE_NAME_COLUMNS: FeaturePageConfig['columns'] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

const PAGE_CONFIG: FeaturePageConfig = {
  eyebrow: 'Payments',
  title: 'Payment History',
  subtitle: 'Review received payments.',
  formTitle: `${'Payment History'} Filters`,
  formDescription: `Static ${'Payment History'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Payment History',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'PAY-8801', name: 'Cash', status: 'Posted' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Payments', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [{ key: 'paymentMode', label: 'Payment Mode', type: 'select', placeholder: 'Choose mode', options: PAYMENT_MODE_OPTIONS }],
  primaryActionLabel: `Search ${'Payment History'}`,
  secondaryActionLabel: 'Clear Filters',
  tableCaption: 'Payment History',
  rows: [{ code: 'PAY-8801', name: 'Cash', status: 'Posted' }],
  columns: CODE_NAME_COLUMNS
};
const ADD_DIALOG_CONFIG: FeaturePageConfig | null = null;


@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent, DateFieldComponent, ActionButtonsComponent, SharedTableComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css'
})
export class PaymentsComponent {
  readonly config: FeaturePageConfig = PAGE_CONFIG;
  readonly addDialogConfig: FeaturePageConfig | null = ADD_DIALOG_CONFIG;
  readonly formState = this.createEmptyState(this.config);
  readonly dialogFormState = this.addDialogConfig ? this.createEmptyState(this.addDialogConfig) : {};
  showAddDialog = false;
  showFilterSidebar = false;
  readonly pageEyebrow = this.config.eyebrow;
  readonly pageTitle = this.config.title;
  readonly pageSubtitle = this.config.subtitle;
  readonly paymentModeOptions = PAYMENT_MODE_OPTIONS;
  readonly summaryCards = this.config.summaryCards;
  readonly filterTitle = this.config.formTitle ?? `${this.config.title} Form`;
  readonly filterDescription = this.config.formDescription ?? '';
  readonly fields = this.config.fields;
  readonly primaryActionLabel = this.config.primaryActionLabel;
  readonly secondaryActionLabel = this.config.secondaryActionLabel ?? '';
  readonly showSecondaryAction = !!this.config.secondaryActionLabel;
  readonly dialogTitle = this.addDialogConfig?.title ?? '';
  readonly dialogSubtitle = this.addDialogConfig?.subtitle ?? '';
  readonly dialogFields = this.addDialogConfig?.fields ?? [];
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = this.config.tableTitle ?? this.config.tableCaption;
  readonly tableDescription = this.config.tableDescription ?? '';
  readonly tableCaption = this.config.tableCaption;
  readonly tableColumns = this.config.columns;
  readonly tableRows = this.config.rows;
    readonly showAddNewButton = !!this.addDialogConfig;
    readonly addNewButtonLabel = this.showAddNewButton ? (this.config.addNewLabel ?? 'Add New') : '';
    readonly showFilterButton = true;

  getFieldValue(fieldKey: string): string | Date | null {
    return this.formState[fieldKey] ?? null;
  }

  setFieldValue(fieldKey: string, value: string | Date | null): void {
    this.formState[fieldKey] = value;
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
    this.resetState(this.formState, this.config);
  }

  openFilterSidebar(): void {
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
    if (!this.addDialogConfig) {
      return;
    }

    this.resetState(this.dialogFormState, this.addDialogConfig);
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.closeAddDialog();
  }

  trackByField(_: number, field: FeatureFieldConfig): string {
    return field.key;
  }

  private createEmptyState(config: FeaturePageConfig): Record<string, string | Date | null> {
    return config.fields.reduce<Record<string, string | Date | null>>((state, field) => {
      state[field.key] = null;
      return state;
    }, {});
  }

  private resetState(state: Record<string, string | Date | null>, config: FeaturePageConfig): void {
    for (const key of Object.keys(state)) {
      delete state[key];
    }

    for (const field of config.fields) {
      state[field.key] = null;
    }
  }
}












