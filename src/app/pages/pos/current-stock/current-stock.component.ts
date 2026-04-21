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

const CATEGORY_OPTIONS: { label: string | number; value: string | number }[] = [];
const STOCK_LOCATION_OPTIONS: { label: string | number; value: string | number }[] = [];
const CODE_NAME_COLUMNS: SharedTableColumn<Record<string, unknown>>[] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

@Component({
  selector: 'app-current-stock',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent, DateFieldComponent, ActionButtonsComponent, SharedTableComponent],
  templateUrl: './current-stock.component.html',
  styleUrl: './current-stock.component.css'
})
export class CurrentStockComponent {  readonly formState: Record<string, string | Date | null> = {};
  readonly dialogFormState: Record<string, string | Date | null> = {};
  showAddDialog = false;
  showFilterSidebar = false;
  readonly pageEyebrow = 'Inventory';
  readonly pageTitle = 'Current Stock';
  readonly pageSubtitle = 'View stock on hand by location.';
  readonly stockLocationOptions = STOCK_LOCATION_OPTIONS;
  readonly categoryOptions = CATEGORY_OPTIONS;  
  readonly filterTitle = `${'Current Stock'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Current Stock'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'location', label: 'Location', type: 'select', placeholder: 'Choose location', options: STOCK_LOCATION_OPTIONS }, { key: 'category', label: 'Category', type: 'select', placeholder: 'Choose category', options: CATEGORY_OPTIONS }];
  readonly primaryActionLabel = `Search ${'Current Stock'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = '';
  readonly dialogSubtitle = '';
  readonly dialogFields: any[] = [];
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Current Stock';
  readonly tableDescription = 'API response data will be shown here.';
  readonly tableCaption = 'Current Stock';
  readonly tableColumns = CODE_NAME_COLUMNS;
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

    get filterLocation(): string | null {
    const value = this.getFieldValue('location');
    return typeof value === 'string' ? value : null;
  }
  set filterLocation(value: string | null) {
    this.setFieldValue('location', value);
  }
  get filterCategory(): string | null {
    const value = this.getFieldValue('category');
    return typeof value === 'string' ? value : null;
  }
  set filterCategory(value: string | null) {
    this.setFieldValue('category', value);
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













