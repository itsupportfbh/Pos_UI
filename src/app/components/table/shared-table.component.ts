import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule, TablePageEvent, TableRowSelectEvent, TableRowUnSelectEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';

export type SharedTableColumnType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'tag';
export type SharedTablePaginationMode = 'client' | 'server';

export interface SharedTableLazyLoadEvent {
  first: number;
  rows: number;
  page: number;
  sortField?: string;
  sortOrder?: number;
}

export interface SharedTablePageChangeEvent {
  first: number;
  rows: number;
  page: number;
}

export interface SharedTableColumn<T = Record<string, unknown>> {
  field: Extract<keyof T, string> | string;
  header: string;
  type?: SharedTableColumnType;
  sortable?: boolean;
  hidden?: boolean;
  width?: string;
  styleClass?: string;
  headerStyleClass?: string;
  bodyStyleClass?: string;
  dateFormat?: string;
  currencyCode?: string;
  digitsInfo?: string;
  booleanLabels?: { true: string; false: string };
  tagSeverityMap?: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'>;
  formatter?: (value: unknown, row: T) => string;
}

@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, ButtonModule, TagModule],
  providers: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './shared-table.component.html',
  styleUrl: './shared-table.component.css'
})
export class SharedTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  @ContentChild('rowActions', { read: TemplateRef }) rowActionsTemplate?: TemplateRef<{ $implicit: T }>;
  @ContentChild('statusTemplate', { read: TemplateRef }) statusTemplate?: TemplateRef<{ $implicit: T }>;
  @Input() columns: SharedTableColumn<T>[] = [];
  @Input() value: T[] = [];
  @Input() caption = '';
  @Input() globalFilterPlaceholder = 'Search records';
  @Input() showAddNewButton = false;
  @Input() showFilterButton = false;
  @Input() filterButtonLabel = 'Filters';
  @Input() filterButtonIcon = 'pi pi-filter';
  @Input() toolbarButtonLabel = '';
  @Input() toolbarButtonIcon = 'pi pi-plus';
  @Input() showRowActions = false;
  @Input() rowActionHeader = 'Actions';
  @Input() emptyMessage = 'No records found.';
  @Input() loading = false;
  @Input() paginator = true;
  @Input() paginationMode: SharedTablePaginationMode = 'client';
  @Input() first = 0;
  @Input() rows = 10;
  @Input() rowsPerPageOptions = [5, 10, 20, 50];
  @Input() totalRecords = 0;
  @Input() dataKey?: string;
  @Input() selectionMode: 'single' | 'multiple' | null = null;
  @Input() selection: T | T[] | null = null;
  @Input() sortMode: 'single' | 'multiple' = 'single';
  @Input() sortField?: string;
  @Input() sortOrder = 1;
  @Input() showGridlines = true;
  @Input() stripedRows = true;
  @Input() rowHover = true;
  @Input() scrollable = true;
  @Input() scrollHeight = 'flex';
  @Input() size: 'small' | 'large' | undefined = undefined;
  @Input() showCurrentPageReport = true;
  @Input() currentPageReportTemplate = 'Showing {first} to {last} of {totalRecords} entries';

  @Output() selectionChange = new EventEmitter<T | T[] | null>();
  @Output() rowSelect = new EventEmitter<T>();
  @Output() rowUnselect = new EventEmitter<T>();
  @Output() lazyLoad = new EventEmitter<SharedTableLazyLoadEvent>();
  @Output() pageChange = new EventEmitter<SharedTablePageChangeEvent>();
  @Output() filterButtonClick = new EventEmitter<void>();
  @Output() toolbarButtonClick = new EventEmitter<void>();
  @Output() editRowClick = new EventEmitter<T>();
  @Output() deleteRowClick = new EventEmitter<T>();
  @Output() activateRowClick = new EventEmitter<T>();
  @Output() deactivateRowClick = new EventEmitter<T>();

  globalFilterValue = '';

  constructor(
    private readonly currencyPipe: CurrencyPipe,
    private readonly datePipe: DatePipe,
    private readonly decimalPipe: DecimalPipe
  ) {}

  get visibleColumns(): SharedTableColumn<T>[] {
    return this.columns.filter((column) => !column.hidden);
  }

  get globalFilterFields(): string[] {
    return this.visibleColumns.map((column) => this.getFieldName(column));
  }

  get isServerPagination(): boolean {
    return this.paginationMode === 'server';
  }

  get resolvedTotalRecords(): number {
    return this.isServerPagination ? this.totalRecords : this.value.length;
  }

  updateSelection(selection: T | T[] | null): void {
    this.selection = selection;
    this.selectionChange.emit(selection);
  }

  emitLazyLoad(event: TableLazyLoadEvent): void {
    if (!this.isServerPagination) {
      return;
    }

    const first = event.first ?? this.first;
    const rows = event.rows ?? this.rows;

    this.first = first;
    this.rows = rows;
    this.sortField = typeof event.sortField === 'string' ? event.sortField : this.sortField;
    this.sortOrder = typeof event.sortOrder === 'number' ? event.sortOrder : this.sortOrder;

    this.lazyLoad.emit({
      first,
      rows,
      page: rows > 0 ? Math.floor(first / rows) : 0,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    });
  }

  emitPageChange(event: TablePageEvent): void {
    this.first = event.first ?? this.first;
    this.rows = event.rows ?? this.rows;

    this.pageChange.emit({
      first: this.first,
      rows: this.rows,
      page: this.rows > 0 ? Math.floor(this.first / this.rows) : 0
    });
  }

  emitRowSelect(event: TableRowSelectEvent<T>): void {
    if (event.data && !Array.isArray(event.data)) {
      this.rowSelect.emit(event.data);
    }
  }

  emitRowUnselect(event: TableRowUnSelectEvent<T>): void {
    if (event.data && !Array.isArray(event.data)) {
      this.rowUnselect.emit(event.data);
    }
  }

  emitToolbarButtonClick(): void {
    this.toolbarButtonClick.emit();
  }

  emitFilterButtonClick(): void {
    this.filterButtonClick.emit();
  }

  emitEditRowClick(row: T): void {
    this.editRowClick.emit(row);
  }

  emitDeleteRowClick(row: T): void {
    this.deleteRowClick.emit(row);
  }

  emitActivateRowClick(row: T): void {
    this.activateRowClick.emit(row);
  }

  emitDeactivateRowClick(row: T): void {
    this.deactivateRowClick.emit(row);
  }

  formatCell(column: SharedTableColumn<T>, row: T): string {
    const value = row[this.getFieldName(column)];

    if (column.formatter) {
      return column.formatter(value, row);
    }

    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (column.type) {
      case 'currency':
        return this.currencyPipe.transform(
          this.toNumber(value),
          column.currencyCode ?? 'USD',
          'symbol',
          column.digitsInfo ?? '1.2-2'
        ) ?? String(value);
      case 'number':
        return this.decimalPipe.transform(this.toNumber(value), column.digitsInfo ?? '1.0-2') ?? String(value);
      case 'date':
        return this.datePipe.transform(this.toDateInput(value), column.dateFormat ?? 'mediumDate') ?? String(value);
      case 'boolean':
        return value ? (column.booleanLabels?.true ?? 'Yes') : (column.booleanLabels?.false ?? 'No');
      default:
        return String(value);
    }
  }

  getTagSeverity(column: SharedTableColumn<T>, row: T): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const value = String(row[this.getFieldName(column)] ?? '');
    return column.tagSeverityMap?.[value] ?? 'secondary';
  }

  trackByField(_: number, column: SharedTableColumn<T>): string {
    return this.getFieldName(column);
  }

  getFieldName(column: SharedTableColumn<T>): string {
    return column.field;
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toDateInput(value: unknown): string | number | Date | null | undefined {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    return String(value);
  }
}
