import { CommonModule } from '@angular/common';
import { Component, ContentChild, ContentChildren, Directive, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableLazyLoadEvent, TableModule, TablePageEvent, TableRowSelectEvent, TableRowUnSelectEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AppLocaleService } from '../../services/app-locale.service';
import { AppToastService } from '../../services/app-toast.service';
import { AppTranslationService } from '../../services/app-translation.service';
import { TableExportService } from '../../services/table-export.service';

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

type DownloadMenuAction = 'excel' | 'pdf';

type DownloadMenuItem = {
  label: string;
  icon: string;
  action: DownloadMenuAction;
};

@Directive({
  selector: 'ng-template[appTableCellTemplate]',
  standalone: true
})
export class SharedTableCellTemplateDirective<T = Record<string, unknown>> {
  @Input('appTableCellTemplate') field = '';

  constructor(public readonly templateRef: TemplateRef<{ $implicit: T; column: SharedTableColumn<T> }>) {}
}

@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, ButtonModule, TagModule],
  templateUrl: './shared-table.component.html',
  styleUrl: './shared-table.component.css'
})
export class SharedTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly appLocale = inject(AppLocaleService);
  private readonly appTranslation = inject(AppTranslationService);
  private readonly tableExportService = inject(TableExportService);
  private readonly toast = inject(AppToastService);
  @ContentChild('rowActions', { read: TemplateRef }) rowActionsTemplate?: TemplateRef<{ $implicit: T }>;
  @ContentChildren(SharedTableCellTemplateDirective) cellTemplates?: QueryList<SharedTableCellTemplateDirective<T>>;
  @ViewChild('dt') table?: Table;
  @Input() columns: SharedTableColumn<T>[] = [];
  @Input() value: T[] = [];
  @Input() caption = '';
  @Input() globalFilterPlaceholder = '';
  @Input() showAddNewButton = false;
  @Input() showFilterButton = false;
  @Input() showDownloadButton = true;
  @Input() filterButtonLabel = '';
  @Input() filterButtonIcon = 'pi pi-filter';
  @Input() downloadButtonLabel = '';
  @Input() downloadButtonIcon = 'pi pi-download';
  @Input() downloadLoading = false;
  @Input() downloadLoadingLabel = '';
  @Input() toolbarButtonLabel = '';
  @Input() toolbarButtonIcon = 'pi pi-plus';
  @Input() showRowActions = false;
  @Input() rowActionHeader = '';
  @Input() emptyMessage = '';
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
  @Input() currentPageReportTemplate = '';

  @Output() selectionChange = new EventEmitter<T | T[] | null>();
  @Output() rowSelect = new EventEmitter<T>();
  @Output() rowUnselect = new EventEmitter<T>();
  @Output() lazyLoad = new EventEmitter<SharedTableLazyLoadEvent>();
  @Output() pageChange = new EventEmitter<SharedTablePageChangeEvent>();
  @Output() filterButtonClick = new EventEmitter<void>();
  @Output() excelDownloadClick = new EventEmitter<void>();
  @Output() pdfDownloadClick = new EventEmitter<void>();
  @Output() toolbarButtonClick = new EventEmitter<void>();
  @Output() editRowClick = new EventEmitter<T>();
  @Output() deleteRowClick = new EventEmitter<T>();
  @Output() activateRowClick = new EventEmitter<T>();
  @Output() deactivateRowClick = new EventEmitter<T>();

  globalFilterValue = '';
  showDownloadMenu = false;
  internalDownloadLoading = false;
  internalDownloadLoadingLabel = '';

  constructor() {}

  get visibleColumns(): SharedTableColumn<T>[] {
    return this.columns.filter((column) => !column.hidden);
  }

  get resolvedDownloadLoading(): boolean {
    return this.downloadLoading || this.internalDownloadLoading;
  }

  get resolvedDownloadLoadingLabel(): string {
    const idleLabel = this.downloadLoadingLabel || this.t('table.exporting', 'Exporting...');
    return this.internalDownloadLoading ? this.internalDownloadLoadingLabel : idleLabel;
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

  get downloadMenuItems(): DownloadMenuItem[] {
    return [
      {
        label: this.t('common.excel', 'Excel'),
        icon: 'pi pi-file-excel',
        action: 'excel'
      },
      {
        label: this.t('common.pdf', 'PDF'),
        icon: 'pi pi-file-pdf',
        action: 'pdf'
      }
    ];
  }

  get resolvedGlobalFilterPlaceholder(): string {
    return this.globalFilterPlaceholder || this.t('table.search_placeholder', 'Search records');
  }

  get resolvedFilterButtonLabel(): string {
    return this.filterButtonLabel || this.t('table.filters', 'Filters');
  }

  get resolvedDownloadButtonLabel(): string {
    return this.downloadButtonLabel || this.t('table.download', 'Download');
  }

  get resolvedRowActionHeader(): string {
    return this.rowActionHeader || this.t('table.actions', 'Actions');
  }

  get resolvedEmptyMessage(): string {
    return this.emptyMessage || this.t('table.empty_message', 'No records found.');
  }

  get resolvedCurrentPageReportTemplate(): string {
    return this.currentPageReportTemplate || this.t('table.page_report', 'Showing {first} to {last} of {totalRecords} entries');
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

  private async runBuiltInExcelExport(): Promise<void> {
    const exportRows = this.getExportRows();
    const exportTitle = this.getExportTitle();

    if (!exportRows.length) {
      this.toast.warn(
        this.t('table.no_records_title', 'No Records'),
        this.t('table.no_records_export', 'No records are available to export.')
      );
      return;
    }

    this.internalDownloadLoading = true;
    this.internalDownloadLoadingLabel = this.t('table.excel_exporting', 'Excel exporting...');

    try {
      await this.tableExportService.exportExcel(this.getExportFileName(), this.visibleColumns, exportRows, exportTitle);
      this.toast.success(
        this.t('table.export_ready_title', 'Export Ready'),
        `${exportTitle} ${this.t('table.excel_export_success', 'Excel export downloaded successfully.')}`
      );
    } catch {
      this.toast.error(
        this.t('table.export_failed_title', 'Export Failed'),
        `${this.t('table.unable_to_export', 'Unable to export')} ${exportTitle.toLowerCase()} ${this.t('common.to_excel', 'to Excel.')}`
      );
    } finally {
      this.internalDownloadLoading = false;
      this.internalDownloadLoadingLabel = '';
    }
  }

  private async runBuiltInPdfExport(): Promise<void> {
    const exportRows = this.getExportRows();
    const exportTitle = this.getExportTitle();

    if (!exportRows.length) {
      this.toast.warn(
        this.t('table.no_records_title', 'No Records'),
        this.t('table.no_records_export', 'No records are available to export.')
      );
      return;
    }

    this.internalDownloadLoading = true;
    this.internalDownloadLoadingLabel = this.t('table.pdf_exporting', 'PDF exporting...');

    try {
      await this.tableExportService.exportPdf(this.getExportFileName(), exportTitle, this.visibleColumns, exportRows);
      this.toast.success(
        this.t('table.export_ready_title', 'Export Ready'),
        `${exportTitle} ${this.t('table.pdf_export_success', 'PDF export downloaded successfully.')}`
      );
    } catch {
      this.toast.error(
        this.t('table.export_failed_title', 'Export Failed'),
        `${this.t('table.unable_to_export', 'Unable to export')} ${exportTitle.toLowerCase()} ${this.t('common.to_pdf', 'to PDF.')}`
      );
    } finally {
      this.internalDownloadLoading = false;
      this.internalDownloadLoadingLabel = '';
    }
  }

  private getExportRows(): T[] {
    const filteredRows = Array.isArray(this.table?.filteredValue) ? this.table.filteredValue as T[] : null;
    return filteredRows ?? this.value;
  }

  private getExportTitle(): string {
    return this.caption?.trim() || 'Export';
  }

  private getExportFileName(): string {
    let orgName = '';

    try {
      const userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
      orgName = String(userDetails.OrgName || userDetails.OrganizationName || '').trim();
    } catch {
      orgName = '';
    }

    const title = this.getExportTitle().replace(/[\\/:*?"<>|]/g, '-');

    if (!orgName) {
      return title;
    }

    return `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-${title}`;
  }

  toggleDownloadMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showDownloadMenu = !this.showDownloadMenu;
  }

  handleDownloadMenuClick(action: DownloadMenuAction, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showDownloadMenu = false;

    if (action === 'excel') {
      if (this.excelDownloadClick.observers.length > 0) {
        this.emitExcelDownloadClick();
      } else {
        void this.runBuiltInExcelExport();
      }
      return;
    }

    if (this.pdfDownloadClick.observers.length > 0) {
      this.emitPdfDownloadClick();
    } else {
      void this.runBuiltInPdfExport();
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: Event): void {
    if (!this.showDownloadMenu) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.showDownloadMenu = false;
    }
  }

  emitExcelDownloadClick(): void {
    this.excelDownloadClick.emit();
  }

  emitPdfDownloadClick(): void {
    this.pdfDownloadClick.emit();
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
        return this.appLocale.formatCurrency(this.toNumber(value), {
          currencyCode: column.currencyCode,
          minimumFractionDigits: this.resolveDigitsInfo(column.digitsInfo).minimumFractionDigits,
          maximumFractionDigits: this.resolveDigitsInfo(column.digitsInfo).maximumFractionDigits
        });
      case 'number':
        return this.appLocale.formatNumber(this.toNumber(value), this.resolveDigitsInfo(column.digitsInfo));
      case 'date':
        return column.dateFormat === 'datetime'
          ? this.appLocale.formatDateTime(this.toDateInput(value))
          : this.appLocale.formatDate(this.toDateInput(value));
      case 'boolean':
        return value
          ? (column.booleanLabels?.true ?? this.t('common.yes', 'Yes'))
          : (column.booleanLabels?.false ?? this.t('common.no', 'No'));
      default:
        return String(value);
    }
  }

  getTagSeverity(column: SharedTableColumn<T>, row: T): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const value = String(row[this.getFieldName(column)] ?? '');
    return column.tagSeverityMap?.[value] ?? 'secondary';
  }

  getCellTemplate(column: SharedTableColumn<T>): TemplateRef<{ $implicit: T; column: SharedTableColumn<T> }> | null {
    const fieldName = this.getFieldName(column);
    return this.cellTemplates?.find((template) => template.field === fieldName)?.templateRef ?? null;
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

  private resolveDigitsInfo(digitsInfo?: string): { minimumFractionDigits?: number; maximumFractionDigits?: number } {
    const match = String(digitsInfo ?? '').match(/^\d+\.(\d+)-(\d+)$/);
    if (!match) {
      return { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    }

    return {
      minimumFractionDigits: Number(match[1]),
      maximumFractionDigits: Number(match[2])
    };
  }

  private t(key: string, fallbackText: string): string {
    return this.appTranslation.t(key, fallbackText);
  }
}
