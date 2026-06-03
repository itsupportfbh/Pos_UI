import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AppTranslatePipe } from '../../../pipes/app-translate.pipe';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { CheckboxFieldComponent } from '../../../components/form/checkbox-field.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { RadioFieldComponent } from '../../../components/form/radio-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextareaFieldComponent } from '../../../components/form/textarea-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppLocaleService } from '../../../services/app-locale.service';
import { AppToastService } from '../../../services/app-toast.service';
import {
  ReportCatalogService,
  ReportCategorySummary,
  ReportDefinition,
  ReportExecutionRequest,
  ReportFilterDefinition,
  ReportSummary,
  RuntimePreviewResult
} from '../../../services/report-catalog.service';
import { TableExportService } from '../../../services/table-export.service';
import { AppTranslationService } from '../../../services/app-translation.service';

type ReportFieldOption = {
  label: string | number;
  value: string | number;
};

type ReportFieldType =
  | 'textbox'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'autocomplete';

type ReportFieldConfig = {
  key: string;
  label: string;
  type: ReportFieldType;
  placeholder: string;
  required: boolean;
  dataType: string;
  options?: ReportFieldOption[];
  suggestions?: string[];
  helperText?: string;
  rows?: number;
  inputMode?: string;
  step?: string;
};

type CategoryOption = {
  label: string;
  value: number;
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TextFieldComponent,
    TextareaFieldComponent,
    SelectFieldComponent,
    MultiSelectFieldComponent,
    CheckboxFieldComponent,
    RadioFieldComponent,
    AutocompleteFieldComponent,
    DateFieldComponent,
    SharedTableComponent,
    AppTranslatePipe
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent {
  private readonly toast = inject(AppToastService);
  private readonly appLocale = inject(AppLocaleService);
  private readonly appTranslation = inject(AppTranslationService);
  private readonly reportCatalogService = inject(ReportCatalogService);
  private readonly tableExportService = inject(TableExportService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly pageEyebrow = 'Reporting';
  readonly pageTitle = 'Reports';
  readonly pageSubtitle = 'Choose a category, pick a report, fill the filters, and view the report result instantly.';
  readonly formState: Record<string, string | Date | number | boolean | MultiSelectFieldValue | null> = {};

  userDetails: any = {};
  categories: ReportCategorySummary[] = [];
  reports: ReportSummary[] = [];
  selectedCategoryId: number | null = null;
  selectedReport: ReportSummary | null = null;
  selectedReportDefinition: ReportDefinition | null = null;
  filterFields: ReportFieldConfig[] = [];
  submitted = false;
  loadingCategories = false;
  loadingReports = false;
  loadingDefinition = false;
  loadingPreview = false;
  categorySwitching = false;
  reportSwitching = false;
  activeCategoryRequestId: number | null = null;
  activeReportRequestId: number | null = null;
  previewResult: RuntimePreviewResult | null = null;
  previewColumns: SharedTableColumn<Record<string, unknown>>[] = [];
  previewRows: Record<string, unknown>[] = [];
  readonly previewCaption = 'Report Result';
  private categoryRequestVersion = 0;
  private reportRequestVersion = 0;

  get hasNoReportAccess(): boolean {
    return !this.loadingCategories && !this.categories.length;
  }

  t(key: string, fallbackText: string): string {
    return this.appTranslation.t(key, fallbackText);
  }

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.initializeReportCenter();
  }

  async initializeReportCenter(): Promise<void> {
    this.loadingCategories = true;
    this.changeDetector.detectChanges();

    try {
      const orgId = this.orgId;
      const roleId = this.roleId;
      const response = await firstValueFrom(this.reportCatalogService.getCategories(orgId, roleId));
      this.categories = response.result ?? [];
      this.changeDetector.detectChanges();

      if (!this.categories.length) {
        this.selectedCategoryId = null;
        this.reports = [];
        this.selectedReport = null;
        this.selectedReportDefinition = null;
        this.filterFields = [];
        this.clearPreviewState();
        this.changeDetector.detectChanges();
        return;
      }

      this.loadingCategories = false;

      const initialCategoryId = this.selectedCategoryId && this.categories.some((category) => category.Id === this.selectedCategoryId)
        ? this.selectedCategoryId
        : this.categories[0].Id;

      await this.selectCategory(initialCategoryId);
    } catch {
      this.toast.error('Reports Load Failed', 'Unable to load report categories. Please check the report catalog setup.');
    } finally {
      this.loadingCategories = false;
      this.changeDetector.detectChanges();
    }
  }

  async selectCategory(categoryId: number): Promise<void> {
    if (!categoryId || this.loadingCategories || this.activeCategoryRequestId === categoryId) {
      return;
    }

    if (this.selectedCategoryId === categoryId && this.reports.length && !this.loadingReports && !this.categorySwitching) {
      return;
    }

    const requestVersion = ++this.categoryRequestVersion;
    this.activeCategoryRequestId = categoryId;
    this.selectedCategoryId = categoryId;
    this.selectedReport = null;
    this.selectedReportDefinition = null;
    this.filterFields = [];
    this.clearPreviewState();
    this.resetForm();
    this.loadingReports = true;
    this.categorySwitching = true;
    this.changeDetector.detectChanges();

    try {
      const response = await firstValueFrom(this.reportCatalogService.getReports(this.orgId, this.roleId, categoryId));
      if (requestVersion !== this.categoryRequestVersion) {
        return;
      }

      this.reports = response.result ?? [];
      this.loadingReports = false;
      this.categorySwitching = false;
      this.activeCategoryRequestId = null;
      this.changeDetector.detectChanges();

      if (!this.reports.length) {
        this.toast.warn('No Reports', 'No reports are configured under the selected category.');
        this.changeDetector.detectChanges();
        return;
      }

      void this.selectReport(this.reports[0]);
    } catch {
      if (requestVersion !== this.categoryRequestVersion) {
        return;
      }

      this.reports = [];
      this.toast.error('Reports Load Failed', 'Unable to load reports for the selected category.');
    } finally {
      if (requestVersion === this.categoryRequestVersion) {
        this.loadingReports = false;
        this.categorySwitching = false;
        this.activeCategoryRequestId = null;
      }
    }
  }

  async selectReport(report: ReportSummary): Promise<void> {
    if (this.activeReportRequestId === report.Id) {
      return;
    }

    const requestVersion = ++this.reportRequestVersion;
    this.activeReportRequestId = report.Id;
    this.selectedReport = report;
    this.previewResult = null;
    this.previewColumns = [];
    this.previewRows = [];
    this.resetForm();
    this.loadingDefinition = true;
    this.reportSwitching = true;
    this.changeDetector.detectChanges();

    try {
      const response = await firstValueFrom(this.reportCatalogService.getReportDefinition(this.orgId, this.roleId, report.Id));
      if (requestVersion !== this.reportRequestVersion) {
        return;
      }

      this.selectedReportDefinition = response.result ?? null;
      this.filterFields = this.buildFieldConfigs(this.selectedReportDefinition?.Filters ?? []);
      this.resetForm();
      this.changeDetector.detectChanges();
    } catch {
      if (requestVersion !== this.reportRequestVersion) {
        return;
      }

      this.selectedReportDefinition = null;
      this.filterFields = [];
      this.toast.error('Report Load Failed', 'Unable to load report filters and permissions.');
      this.changeDetector.detectChanges();
    } finally {
      if (requestVersion === this.reportRequestVersion) {
        this.loadingDefinition = false;
        this.reportSwitching = false;
        this.activeReportRequestId = null;
        this.changeDetector.detectChanges();
      }
    }
  }

  async viewReport(): Promise<void> {
    this.submitted = true;

    if (!this.selectedReportDefinition) {
      this.toast.warn('Select Report', 'Choose a report before viewing.');
      return;
    }

    const executionFilters = this.buildExecutionFilters();
    const missingFilter = this.getActiveReportFilters().find((filter) =>
      this.isFilterValueMissing(filter, executionFilters[filter.FieldName] ?? null)
    );

    if (missingFilter) {
      this.toast.warn('Filter Required', `${missingFilter.DisplayName} is required.`);
      return;
    }

    this.loadingPreview = true;
    this.changeDetector.detectChanges();

    try {
      const request: ReportExecutionRequest = {
        OrgId: this.orgId,
        RoleId: this.roleId,
        ReportId: this.selectedReportDefinition.Id,
        Filters: executionFilters
      };

      const response = await firstValueFrom(this.reportCatalogService.previewReport(request));
      this.previewResult = response.result;
      this.previewColumns = this.mapPreviewColumns(this.previewResult.Columns ?? []);
      this.previewRows = this.previewResult.Rows ?? [];
      this.changeDetector.detectChanges();

      if (!this.previewRows.length) {
        this.toast.warn('No Data', 'The report ran successfully but returned no rows.');
        return;
      }
    } catch {
      this.clearPreviewState();
      this.toast.error('Report Failed', 'Unable to execute the report. Please verify the stored procedure and filters.');
      this.changeDetector.detectChanges();
    } finally {
      this.loadingPreview = false;
      this.changeDetector.detectChanges();
    }
  }

  clearFilters(): void {
    this.submitted = false;
    this.resetForm();
    this.clearPreviewState();
    this.changeDetector.detectChanges();
  }

  async exportExcel(): Promise<void> {
    if (!this.previewRows.length) {
      this.toast.warn('No Data', 'Load a report first before exporting to Excel.');
      return;
    }

    await this.tableExportService.exportExcel(this.exportFileName, this.previewColumns, this.previewRows, this.exportSheetName);
    this.toast.success('Export Ready', 'Excel export completed successfully.');
  }

  async exportPdf(): Promise<void> {
    if (!this.previewRows.length) {
      this.toast.warn('No Data', 'Load a report first before exporting to PDF.');
      return;
    }

    await this.tableExportService.exportPdf(this.exportFileName, this.exportTitle, this.previewColumns, this.previewRows);
    this.toast.success('Export Ready', 'PDF export completed successfully.');
  }

  printReport(): void {
    if (!this.previewRows.length) {
      this.toast.warn('No Data', 'Load a report first before printing.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      this.toast.error('Print Failed', 'Unable to open the print window.');
      return;
    }

    printWindow.document.write(this.isThermalReport
      ? this.buildThermalPrintMarkup()
      : this.buildStandardPrintMarkup());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  getFieldValue(fieldKey: string): string | Date | number | boolean | MultiSelectFieldValue | null {
    return this.formState[fieldKey] ?? null;
  }

  setFieldValue(fieldKey: string, value: string | Date | number | boolean | MultiSelectFieldValue | null): void {
    this.formState[fieldKey] = value;
  }

  asTextValue(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  asCheckboxValue(value: unknown): boolean {
    return value === true;
  }

  trackByField(_: number, field: ReportFieldConfig): string {
    return field.key;
  }

  get exportTitle(): string {
    return this.selectedReportDefinition?.DisplayName || 'Report';
  }

  get exportSheetName(): string {
    return this.selectedReportDefinition?.ReportCode || 'Report';
  }

  get exportFileName(): string {
    const orgName = String(this.userDetails?.OrgName || this.userDetails?.OrganizationName || 'Report').trim();
    const reportName = String(this.selectedReportDefinition?.DisplayName || 'Report').trim();
    return `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-${reportName.replace(/[\\/:*?"<>|]/g, '-')}`;
  }

  get resultStatusMessage(): string {
    if (this.previewResult && this.previewRows.length) {
      const reportName = this.selectedReportDefinition?.DisplayName || 'Report';
      const template = this.t('reports.result_showing', 'Showing {count} row(s) from {report}.');
      return template
        .replace('{count}', String(this.previewRows.length))
        .replace('{report}', reportName)
        .replace('row(s)', this.previewRows.length === 1 ? 'row' : 'rows');
    }

    if (this.previewResult && !this.previewRows.length) {
      return this.t('reports.no_data', 'No data found for selected filters.');
    }

    return this.t('reports.result_subtitle', 'Run the report to display the result set here.');
  }

  get loadingStatusLabel(): string {
    return this.t('reports.loading_title', 'Loading Reports . . . . .');
  }

  get resultEmptyMessage(): string {
    if (this.loadingPreview) {
      return this.t('reports.loading_short', 'Loading report...');
    }

    if (this.previewResult && !this.previewRows.length) {
      return this.t('reports.no_data', 'No data found for selected filters.');
    }

    return this.t('reports.no_result_data', 'No report data available.');
  }

  get currentCategoryName(): string {
    return this.categories.find((category) => category.Id === this.selectedCategoryId)?.Name ?? '';
  }

  get categoryOptions(): CategoryOption[] {
    return this.categories.map((category) => ({
      label: category.Name,
      value: category.Id
    }));
  }

  get effectiveHtmlTemplate(): string | null {
    return this.previewResult?.HtmlTemplate ?? this.selectedReportDefinition?.HtmlTemplate ?? null;
  }

  get hasHtmlTemplate(): boolean {
    return !!this.effectiveHtmlTemplate?.trim();
  }

  get renderedHtmlTemplate(): SafeHtml | null {
    const template = this.effectiveHtmlTemplate;
    if (!template || !this.previewResult) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(this.compileHtmlTemplate(template));
  }

  get isThermalReport(): boolean {
    return this.previewResult?.Report?.IsThermal === true || this.selectedReportDefinition?.IsThermal === true;
  }

  private get orgId(): number {
    return Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
  }

  private get roleId(): number {
    return Number(this.userDetails?.RoleId || 0);
  }

  private buildFieldConfigs(filters: ReportFilterDefinition[]): ReportFieldConfig[] {
    return filters
      .filter((filter) => filter.IsShow !== false)
      .map((filter) => {
      const type = this.resolveFieldType(filter.ControlType);
      const options = this.resolveOptions(filter, type);

      return {
        key: filter.FieldName,
        label: filter.DisplayName,
        type,
        placeholder: this.resolvePlaceholder(filter, type),
        required: filter.IsRequired,
        dataType: filter.DataType,
        options,
        suggestions: this.resolveSuggestions(type, options),
        helperText: this.resolveHelperText(filter, type),
        rows: type === 'textarea' ? 4 : undefined,
        inputMode: type === 'number' ? 'decimal' : undefined,
        step: this.resolveNumberStep(filter)
      };
    });
  }

  private resolveFieldType(controlType: string): ReportFieldType {
    const normalizedControl = String(controlType || '').trim().toLowerCase();

    switch (normalizedControl) {
      case 'textarea':
      case 'number':
      case 'date':
      case 'datetime':
      case 'dropdown':
      case 'multiselect':
      case 'checkbox':
      case 'radio':
      case 'autocomplete':
        return normalizedControl;
      case 'text':
      case 'textbox':
      default:
        return 'textbox';
    }
  }

  private resolvePlaceholder(filter: ReportFilterDefinition, fieldType: ReportFieldType): string {
    if (fieldType === 'checkbox') {
      return '';
    }

    if (fieldType === 'date' || fieldType === 'datetime') {
      return `Choose ${filter.DisplayName.toLowerCase()}`;
    }

    if (fieldType === 'dropdown' || fieldType === 'multiselect' || fieldType === 'radio' || fieldType === 'autocomplete') {
      return `Select ${filter.DisplayName.toLowerCase()}`;
    }

    if (fieldType === 'textarea') {
      return `Enter ${filter.DisplayName.toLowerCase()}`;
    }

    return `Enter ${filter.DisplayName.toLowerCase()}`;
  }

  private resolveHelperText(filter: ReportFilterDefinition, fieldType: ReportFieldType): string {
    return '';
  }

  private resolveOptions(filter: ReportFilterDefinition, fieldType: ReportFieldType): ReportFieldOption[] {
    const normalizedFieldName = String(filter.FieldName || '').toLowerCase();
    const normalizedDataType = String(filter.DataType || '').toLowerCase();

    if (normalizedFieldName.includes('branch') && this.userDetails?.BranchId) {
      return [{ label: this.userDetails?.BranchName || 'Current Branch', value: this.userDetails?.BranchId || '' }];
    }

    if ((fieldType === 'dropdown' || fieldType === 'radio' || fieldType === 'autocomplete') && normalizedDataType === 'boolean') {
      return [
        { label: 'Yes', value: 1 },
        { label: 'No', value: 0 }
      ];
    }

    return [];
  }

  private resolveSuggestions(fieldType: ReportFieldType, options: ReportFieldOption[]): string[] {
    if (fieldType !== 'autocomplete') {
      return [];
    }

    return options.map((option) => String(option.label));
  }

  private resolveNumberStep(filter: ReportFilterDefinition): string {
    const normalizedDataType = String(filter.DataType || '').toLowerCase();
    return normalizedDataType === 'decimal' || normalizedDataType === 'numeric' || normalizedDataType === 'money'
      ? '0.01'
      : '1';
  }

  private isFilterValueMissing(filter: ReportFilterDefinition, value: string | number | boolean | null): boolean {
    if (!filter.IsRequired) {
      return false;
    }

    const fieldType = this.resolveFieldType(filter.ControlType);

    switch (fieldType) {
      case 'checkbox':
        return value !== true;
      case 'multiselect': {
        if (value === null || value === undefined) {
          return true;
        }

        return String(value).trim().length === 0;
      }
      case 'number':
        return value === null || value === '' || value === undefined || Number.isNaN(Number(value));
      default:
        return value === null || value === undefined || String(value).trim().length === 0;
    }
  }

  private buildExecutionFilters(): Record<string, string | number | boolean | null> {
    return this.getActiveReportFilters().reduce<Record<string, string | number | boolean | null>>((result, filter) => {
      result[filter.FieldName] = this.getExecutionFilterValue(filter);
      return result;
    }, {});
  }

  private mapPreviewColumns(columns: { field: string; header: string; type: string }[]): SharedTableColumn<Record<string, unknown>>[] {
    return columns.map((column) => ({
      field: column.field,
      header: column.header,
      sortable: true,
      type: this.resolvePreviewColumnType(column.type)
    }));
  }

  private resolvePreviewColumnType(type: string): 'text' | 'number' | 'date' | 'boolean' {
    const normalizedType = String(type || '').toLowerCase();

    if (normalizedType === 'number' || normalizedType === 'currency') {
      return 'number';
    }

    if (normalizedType === 'date') {
      return 'date';
    }

    if (normalizedType === 'boolean') {
      return 'boolean';
    }

    return 'text';
  }

  private clearPreviewState(): void {
    this.previewResult = null;
    this.previewColumns = [];
    this.previewRows = [];
  }

  private resetForm(): void {
    for (const key of Object.keys(this.formState)) {
      delete this.formState[key];
    }

    for (const filter of this.getActiveReportFilters()) {
      this.formState[filter.FieldName] = this.getDefaultValueForFilter(filter);
    }
  }

  private getDefaultValueForFilter(filter: ReportFilterDefinition): string | Date | number | boolean | MultiSelectFieldValue | null {
    switch (this.resolveFieldType(filter.ControlType)) {
      case 'checkbox':
        return false;
      case 'multiselect':
        return [];
      default:
        return null;
    }
  }

  private getActiveReportFilters(): ReportFilterDefinition[] {
    return (this.selectedReportDefinition?.Filters ?? []).filter((filter) => filter.IsActive !== false);
  }

  private getExecutionFilterValue(filter: ReportFilterDefinition): string | number | boolean | null {
    const value = this.getFieldValue(filter.FieldName);

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.length ? value.join(',') : null;
    }

    if (value === undefined || value === null || value === '') {
      return this.resolveHiddenFilterValue(filter);
    }

    return value as string | number | boolean | null;
  }

  private resolveHiddenFilterValue(filter: ReportFilterDefinition): string | number | boolean | null {
    if (filter.IsShow !== false) {
      return null;
    }

    const normalizedFieldName = String(filter.FieldName || '').trim().toLowerCase();

    switch (normalizedFieldName) {
      case 'orgid':
        return this.orgId > 0 ? this.orgId : null;
      case 'branchid': {
        const branchId = Number(this.userDetails?.BranchId || 0);
        return branchId > 0 ? branchId : null;
      }
      case 'roleid':
        return this.roleId > 0 ? this.roleId : null;
      case 'userid':
      case 'employeeid': {
        const userId = Number(this.userDetails?.UserId || this.userDetails?.EmployeeId || 0);
        return userId > 0 ? userId : null;
      }
      default:
        return null;
    }
  }

  private formatPrintValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.appLocale.formatDate(value);
    }

    return String(value);
  }

  private buildStandardPrintMarkup(): string {
    if (this.hasHtmlTemplate && this.effectiveHtmlTemplate && this.previewResult) {
      return `
        <html>
          <head>
            <title>${this.escapeHtml(this.exportTitle)}</title>
            <style>
              @page { size: ${this.resolveStandardPageSize()}; margin: 12mm; }
              body { margin: 0; background: #fff; }
            </style>
          </head>
          <body>${this.compileHtmlTemplate(this.effectiveHtmlTemplate)}</body>
        </html>
      `;
    }

    const pageSize = this.resolveStandardPageSize();
    const headers = this.previewColumns.map((column) => `<th>${this.escapeHtml(column.header)}</th>`).join('');
    const bodyRows = this.previewRows
      .map((row) => {
        const cells = this.previewColumns
          .map((column) => `<td>${this.escapeHtml(this.formatPrintValue(row[column.field]))}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <html>
        <head>
          <title>${this.escapeHtml(this.exportTitle)}</title>
          <style>
            @page { size: ${pageSize}; margin: 12mm; }
            body { font-family: Arial, sans-serif; padding: 12px; color: #2f241b; }
            h1 { margin-bottom: 8px; }
            p { margin-top: 0; color: #735c4b; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #d8c4b1; padding: 8px 10px; text-align: left; font-size: 13px; }
            th { background: #f8efe8; }
            tr:nth-child(even) td { background: #fcf8f4; }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(this.exportTitle)}</h1>
          <p>${this.escapeHtml(this.selectedReportDefinition?.Description ?? '')}</p>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;
  }

  private buildThermalPrintMarkup(): string {
    if (this.hasHtmlTemplate && this.effectiveHtmlTemplate && this.previewResult) {
      return `
        <html>
          <head>
            <title>${this.escapeHtml(this.exportTitle)}</title>
            <style>
              @page { size: ${this.resolveThermalPageSize()}; margin: 0; }
              body { margin: 0; background: #fff; }
            </style>
          </head>
          <body>${this.compileHtmlTemplate(this.effectiveHtmlTemplate)}</body>
        </html>
      `;
    }

    const paperWidth = this.resolveThermalPaperWidth();
    const thermalPageSize = this.resolveThermalPageSize();
    const detailRows = this.previewRows
      .map((row) => `
        <div class="receipt-line">
          <div class="receipt-line-main">
            <strong>${this.escapeHtml(this.formatPrintValue(row['BillNo'] ?? row[this.previewColumns[0]?.field ?? '']))}</strong>
            <span>${this.escapeHtml(this.formatPrintValue(row['BillDate'] ?? ''))}</span>
          </div>
          <div class="receipt-line-sub">
            <span>${this.escapeHtml(this.formatPrintValue(row['PaymentMode'] ?? row['StewardName'] ?? ''))}</span>
            <strong>${this.escapeHtml(this.formatCurrencyLike(row['NetAmount'] ?? row[this.previewColumns[this.previewColumns.length - 1]?.field ?? '']))}</strong>
          </div>
        </div>
      `)
      .join('');

    const totalsBlock = [
      { label: 'Rows', value: String(this.previewRows.length) },
      { label: 'Total', value: this.formatCurrencyLike(this.resolveAggregateValue('sum', 'NetAmount')) }
    ].map((item) => `
      <div class="total-row">
        <span>${this.escapeHtml(item.label)}</span>
        <strong>${this.escapeHtml(item.value)}</strong>
      </div>
    `).join('');

    return `
      <html>
        <head>
          <title>${this.escapeHtml(this.exportTitle)}</title>
          <style>
            @page { size: ${thermalPageSize}; margin: 0; }
            body {
              font-family: 'Courier New', monospace;
              color: #111827;
              margin: 0 auto;
              padding: 8px 6px 14px;
              width: calc(${paperWidth} - 12px);
              max-width: calc(${paperWidth} - 12px);
            }
            .receipt {
              width: 100%;
            }
            .receipt-header {
              border-bottom: 1px dashed #9ca3af;
              padding-bottom: 8px;
              text-align: center;
            }
            .receipt-header h1,
            .receipt-header h2,
            .receipt-header p,
            .receipt-header div {
              margin: 0;
            }
            .receipt-header h1 {
              font-size: 15px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .receipt-header h2 {
              font-size: 12px;
              font-weight: 700;
              margin-top: 6px;
            }
            .receipt-header .meta {
              font-size: 10px;
              line-height: 1.35;
            }
            .receipt-section-title {
              font-size: 11px;
              font-weight: 700;
              margin: 10px 0 6px;
              text-transform: uppercase;
            }
            .receipt-line {
              border-bottom: 1px dashed #e5e7eb;
              padding: 6px 0;
            }
            .receipt-line-main,
            .receipt-line-sub,
            .total-row {
              align-items: center;
              display: flex;
              font-size: 11px;
              justify-content: space-between;
              gap: 8px;
            }
            .receipt-line-main span,
            .receipt-line-sub span,
            .receipt-footer {
              color: #4b5563;
            }
            .totals {
              border-top: 1px dashed #9ca3af;
              margin-top: 8px;
              padding-top: 8px;
            }
            .total-row {
              margin-bottom: 4px;
            }
            .receipt-footer {
              border-top: 1px dashed #9ca3af;
              font-size: 10px;
              margin-top: 8px;
              padding-top: 8px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="receipt-header">
              <h1>${this.escapeHtml(this.exportTitle)}</h1>
              <p class="meta">${this.escapeHtml(this.selectedReportDefinition?.Description || '')}</p>
              <p class="meta">${this.escapeHtml(this.resultStatusMessage)}</p>
            </div>

            <div class="receipt-section-title">Items</div>
            ${detailRows}

            <div class="totals">
              ${totalsBlock}
            </div>

            <div class="receipt-footer">
              Printed on ${this.escapeHtml(this.appLocale.formatDateTime(new Date()))}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private resolveStandardPageSize(): string {
    const width = this.resolveConfiguredPaperDimension(this.previewResult?.Report?.PaperWidth ?? this.selectedReportDefinition?.PaperWidth);
    const height = this.resolveConfiguredPaperDimension(this.previewResult?.Report?.PaperHeight ?? this.selectedReportDefinition?.PaperHeight);
    const orientation = this.resolvePrintOrientation();

    if (width && height) {
      return `${width} ${height}`;
    }

    if (width) {
      return `${width} auto`;
    }

    if (height) {
      return `auto ${height}`;
    }

    return `A4 ${orientation}`;
  }

  private resolveThermalPaperWidth(): string {
    return this.resolveConfiguredPaperDimension(this.previewResult?.Report?.PaperWidth ?? this.selectedReportDefinition?.PaperWidth) || '80mm';
  }

  private resolveThermalPageSize(): string {
    const width = this.resolveThermalPaperWidth();
    const height = this.resolveConfiguredPaperDimension(this.previewResult?.Report?.PaperHeight ?? this.selectedReportDefinition?.PaperHeight);
    return height && height !== '0mm' && height !== '0in' ? `${width} ${height}` : `${width} auto`;
  }

  private resolveConfiguredPaperDimension(value: number | undefined): string | null {
    const numericValue = Number(value ?? 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    if (numericValue > 20) {
      return `${numericValue}mm`;
    }

    return `${numericValue}in`;
  }

  private resolvePrintOrientation(): 'portrait' | 'landscape' {
    const orientation = String(
      this.previewResult?.Report?.Orientation
      ?? this.selectedReportDefinition?.Orientation
      ?? ''
    ).trim().toLowerCase();

    if (orientation === 'landscape') {
      return 'landscape';
    }

    if (orientation === 'portrait') {
      return 'portrait';
    }

    return this.selectedReportDefinition?.IsLandscape ? 'landscape' : 'portrait';
  }

  private formatCurrencyLike(value: unknown): string {
    return this.appLocale.formatCurrency(value, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private compileHtmlTemplate(template: string): string {
    let rendered = String(template || '');

    rendered = rendered.replace(/\{\{#rows\}\}([\s\S]*?)\{\{\/rows\}\}/g, (_match, block: string) =>
      this.previewRows.map((row, index) => this.renderRowBlock(block, row, index)).join('')
    );

    rendered = rendered.replace(/\{\{table\}\}/g, this.buildHtmlTemplateTable());

    rendered = rendered.replace(/\{\{\s*(sum|avg|count|min|max):([A-Za-z0-9_]+)(?:\|([A-Za-z]+))?\s*\}\}/g,
      (_match, aggregate: string, field: string, format?: string) => {
        const value = this.resolveAggregateValue(aggregate, field);
        return this.escapeHtml(this.formatTemplateValue(value, format));
      });

    rendered = rendered.replace(/\{\{\s*([A-Za-z0-9_.]+)(?:\|([A-Za-z]+))?\s*\}\}/g,
      (_match, token: string, format?: string) => this.escapeHtml(this.resolveTemplateToken(token, format)));

    return rendered;
  }

  private renderRowBlock(block: string, row: Record<string, unknown>, index: number): string {
    return block.replace(/\{\{\s*([A-Za-z0-9_]+)(?:\|([A-Za-z]+))?\s*\}\}/g, (_match, token: string, format?: string) => {
      if (token === 'rowIndex') {
        return this.escapeHtml(String(index + 1));
      }

      return this.escapeHtml(this.formatTemplateValue(row[token], format));
    });
  }

  private resolveTemplateToken(token: string, format?: string): string {
    const parts = token.split('.');
    const root = parts[0]?.toLowerCase();
    const key = parts.slice(1).join('.');

    switch (root) {
      case 'report':
        return this.formatTemplateValue(this.resolveNestedValue({
          Id: this.selectedReportDefinition?.Id,
          ReportCode: this.selectedReportDefinition?.ReportCode,
          ReportName: this.selectedReportDefinition?.ReportName,
          DisplayName: this.selectedReportDefinition?.DisplayName,
          Description: this.selectedReportDefinition?.Description,
          TemplateName: this.selectedReportDefinition?.TemplateName,
          TemplatePath: this.selectedReportDefinition?.TemplatePath
        }, key), format);
      case 'meta':
        return this.formatTemplateValue(this.resolveNestedValue({
          RowCount: this.previewResult?.RowCount ?? this.previewRows.length,
          ExecutedAt: this.previewResult?.ExecutedAt ?? null
        }, key), format);
      case 'filter':
        return this.formatTemplateValue(this.getFieldValue(key), format);
      case 'user':
        return this.formatTemplateValue(this.resolveNestedValue(this.userDetails ?? {}, key), format);
      default:
        return this.formatTemplateValue(this.resolveNestedValue({
          report: this.selectedReportDefinition ?? {},
          meta: {
            RowCount: this.previewResult?.RowCount ?? this.previewRows.length,
            ExecutedAt: this.previewResult?.ExecutedAt ?? null
          },
          user: this.userDetails ?? {}
        }, token), format);
    }
  }

  private buildHtmlTemplateTable(): string {
    const headerCells = this.previewColumns
      .map((column) => `<th>${this.escapeHtml(column.header)}</th>`)
      .join('');

    const bodyRows = this.previewRows
      .map((row) => {
        const cells = this.previewColumns
          .map((column) => `<td>${this.escapeHtml(this.formatTemplateValue(row[column.field], this.inferTemplateFormat(column.type)))}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <table class="report-template-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `;
  }

  private resolveAggregateValue(aggregate: string, field: string): unknown {
    const values = this.previewRows
      .map((row) => row[field])
      .filter((value) => value !== null && value !== undefined && value !== '');

    switch (aggregate.toLowerCase()) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce<number>((total, value) => total + this.toNumericValue(value), 0);
      case 'avg':
        return values.length ? values.reduce<number>((total, value) => total + this.toNumericValue(value), 0) / values.length : 0;
      case 'min':
        return values.length ? Math.min(...values.map((value) => this.toNumericValue(value))) : null;
      case 'max':
        return values.length ? Math.max(...values.map((value) => this.toNumericValue(value))) : null;
      default:
        return null;
    }
  }

  private formatTemplateValue(value: unknown, format?: string): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    switch ((format || '').toLowerCase()) {
      case 'currency':
        return this.formatCurrencyLike(value);
      case 'number': {
        return this.appLocale.formatNumber(value, { maximumFractionDigits: 2 });
      }
      case 'date': {
        return this.appLocale.formatDate(value);
      }
      case 'datetime': {
        return this.appLocale.formatDateTime(value);
      }
      case 'boolean':
        return value === true || String(value).toLowerCase() === 'true' ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  private inferTemplateFormat(type: string | undefined): string | undefined {
    switch (type) {
      case 'currency':
      case 'number':
      case 'date':
      case 'datetime':
      case 'boolean':
        return type;
      default:
        return undefined;
    }
  }

  private resolveNestedValue(source: Record<string, unknown>, path: string): unknown {
    if (!path) {
      return source;
    }

    return path.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') {
        return null;
      }

      return (current as Record<string, unknown>)[part] ?? null;
    }, source);
  }

  onCategoryChange(categoryId: number | null): void {
    if (!categoryId) {
      return;
    }

    void this.selectCategory(categoryId);
  }

  private toNumericValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}
