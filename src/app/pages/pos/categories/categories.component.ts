import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';

const CODE_NAME_COLUMNS: FeaturePageConfig['columns'] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

const PAGE_CONFIG: FeaturePageConfig = {
  eyebrow: 'Products',
  title: 'Categories',
  subtitle: 'Maintain product categories.',
  formTitle: `${'Categories'} Filters`,
  formDescription: `Static ${'Categories'.toLowerCase()} page ready for API integration.`,
  tableTitle: 'Categories',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: `${[{ code: 'CAT-01', name: 'Beverages', status: 'Active' }].length}`, caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Products', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [{ key: 'categoryName', label: 'Category Name', type: 'text', placeholder: 'Enter category name' }],
  primaryActionLabel: `Search ${'Categories'}`,
  secondaryActionLabel: 'Clear Filters',
  showAddNewButton: true,
  addNewLabel: 'Add New',
  tableCaption: 'Categories',
  rows: [{ code: 'CAT-01', name: 'Beverages', status: 'Active' }],
  columns: CODE_NAME_COLUMNS
};
const ADD_DIALOG_CONFIG: FeaturePageConfig | null = {
  eyebrow: 'Products',
  title: 'Create Category',
  subtitle: 'Create a new product category.',
  formTitle: 'Create Category',
  formDescription: 'Static create category form ready for API integration.',
  tableTitle: 'Create Category',
  tableDescription: 'Replace this static data with your API response later.',
  helperPoints: ['This screen is structured for easy API binding.', 'The layout is intentionally separated into filters, summary, and table.'],
  summaryCards: [
    { label: 'Records', value: '1', caption: 'Static records shown on this page' },
    { label: 'Module', value: 'Products', caption: 'Current functional area' },
    { label: 'Mode', value: 'Static UI', caption: 'Ready for API replacement' }
  ],
  fields: [
    { key: 'categoryCode', label: 'Category Code', type: 'text', placeholder: 'CAT-02' },
    { key: 'categoryName', label: 'Category Name', type: 'text', placeholder: 'Bakery' }
  ],
  primaryActionLabel: 'Save',
  secondaryActionLabel: 'Clear',
  tableCaption: 'Create Category',
  rows: [{ code: 'CAT-02', name: 'Bakery', status: 'Draft' }],
  columns: CODE_NAME_COLUMNS
};


type FeatureFieldType = 'text' | 'select' | 'autocomplete' | 'date';

interface FeatureFieldConfig {
  key: string;
  label: string;
  type: FeatureFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string | number; value: string | number }[];
  suggestions?: string[];
  optionLabel?: string;
  showClear?: boolean;
  filter?: boolean;
  dropdown?: boolean;
  forceSelection?: boolean;
  showIcon?: boolean;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
}

interface SummaryCard {
  label: string;
  value: string;
  caption: string;
}

interface FeaturePageConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  formTitle?: string;
  formDescription?: string;
  tableTitle?: string;
  tableDescription?: string;
  helperPoints?: string[];
  summaryCards: SummaryCard[];
  fields: FeatureFieldConfig[];
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  showAddNewButton?: boolean;
  addNewLabel?: string;
  tableCaption: string;
  emptyMessage?: string;
  rows: Record<string, unknown>[];
  columns: SharedTableColumn<Record<string, unknown>>[];
}
@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  private readonly toast = inject(AppToastService);
  readonly config: FeaturePageConfig = PAGE_CONFIG;
  readonly addDialogConfig: FeaturePageConfig | null = ADD_DIALOG_CONFIG;
  showAddDialog = false;
  showFilterSidebar = false;
  filterCategoryName = '';
  dialogCategoryCode = '';
  dialogCategoryName = '';
  selectedRow: Record<string, unknown> | null = null;
  readonly pageEyebrow = this.config.eyebrow;
  readonly pageTitle = this.config.title;
  readonly pageSubtitle = this.config.subtitle;
  readonly summaryCards = this.config.summaryCards;
  readonly filterTitle = this.config.formTitle ?? `${this.config.title} Form`;
  readonly filterDescription = this.config.formDescription ?? '';
  readonly fields = this.config.fields;
  readonly primaryActionLabel = this.config.primaryActionLabel;
  readonly secondaryActionLabel = this.config.secondaryActionLabel ?? '';
  readonly showSecondaryAction = !!this.config.secondaryActionLabel;
  readonly dialogTitle = this.addDialogConfig?.title ?? '';
  readonly dialogSubtitle = this.addDialogConfig?.subtitle ?? '';
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = this.config.tableTitle ?? this.config.tableCaption;
  readonly tableDescription = this.config.tableDescription ?? '';
  readonly tableCaption = this.config.tableCaption;
  readonly tableColumns = this.config.columns;
  readonly tableRows = this.config.rows;
    readonly showAddNewButton = !!this.addDialogConfig;
    readonly addNewButtonLabel = this.showAddNewButton ? (this.config.addNewLabel ?? 'Add New') : '';
    readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  resetForm(): void {
    this.filterCategoryName = '';
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

    this.resetDialogForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.toast.success('Saved', `${this.dialogTitle || this.pageTitle} saved successfully.`);
    this.closeAddDialog();
  }

  editRow(row: Record<string, unknown>): void {
    if (!this.addDialogConfig) {
      return;
    }

    this.dialogCategoryCode = String(row['categoryCode'] ?? row['code'] ?? '');
    this.dialogCategoryName = String(row['categoryName'] ?? row['name'] ?? '');
    this.showAddDialog = true;
    this.toast.info('Edit Mode', `Editing ${String(row['name'] ?? row['code'] ?? this.pageTitle)}.`);
  }

  deleteRow(row: Record<string, unknown>): void {
    const rowIndex = this.tableRows.indexOf(row);

    if (rowIndex >= 0) {
      this.tableRows.splice(rowIndex, 1);
    }

    this.toast.warn('Deleted', `${String(row['name'] ?? row['code'] ?? 'Record')} removed successfully.`);
  }

  activateRow(row: Record<string, unknown>): void {
    row['status'] = 'Active';
    this.toast.success('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as active.`);
  }

  deactivateRow(row: Record<string, unknown>): void {
    row['status'] = 'Inactive';
    this.toast.info('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as inactive.`);
  }

  openRowActions(menu: any, event: Event, row: Record<string, unknown>): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.deleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.activateRow(this.selectedRow);
    } else {
      this.deactivateRow(this.selectedRow);
    }
  }

  private resetDialogForm(): void {
    this.dialogCategoryCode = '';
    this.dialogCategoryName = '';
  }
}


















