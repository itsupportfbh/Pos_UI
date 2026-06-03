import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface ReportCategorySummary {
  Id: number;
  Name: string;
  DisplayOrder: number;
  ReportCount: number;
}

export interface ReportSummary {
  Id: number;
  CategoryId: number;
  CategoryName: string;
  ReportCode: string;
  ReportName: string;
  DisplayName: string;
  Description?: string;
  StoredProcedure: string;
  TemplateName: string;
  TemplatePath: string;
  ReportType?: string;
  ViewerType?: string;
  PaperWidth?: number;
  PaperHeight?: number;
  Orientation?: string;
  IsThermal: boolean;
  IsLandscape: boolean;
  DisplayOrder: number;
  Icon?: string;
  CanView: boolean;
  CanPrint: boolean;
  ExportPdf: boolean;
  ExportExcel: boolean;
  TemplateExists: boolean;
}

export interface ReportFilterDefinition {
  Id: number;
  ReportId: number;
  FieldName: string;
  DisplayName: string;
  ControlType: string;
  DataType: string;
  IsRequired: boolean;
  IsActive: boolean;
  IsShow: boolean;
  DisplayOrder: number;
}

export interface ReportLayoutTheme {
  accent?: 'sunset' | 'emerald' | 'ocean' | 'violet' | 'slate';
  density?: 'comfortable' | 'compact';
}

export interface ReportLayoutHero {
  kicker?: string;
  title?: string;
  subtitle?: string;
}

export interface ReportLayoutMetricItem {
  label: string;
  field: string;
  aggregate?: 'first' | 'sum' | 'count' | 'average' | 'min' | 'max';
  format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
  icon?: string;
  prefix?: string;
  suffix?: string;
}

export interface ReportLayoutHeaderSection {
  type: 'reportHeader';
  title?: string;
  subtitle?: string;
  orgName?: string;
  orgAddressLines?: string[];
  note?: string;
  alignment?: 'left' | 'center';
}

export interface ReportLayoutSummaryCardsSection {
  type: 'summaryCards';
  title?: string;
  subtitle?: string;
  items: ReportLayoutMetricItem[];
}

export interface ReportLayoutCalculationsPanelSection {
  type: 'calculationsPanel';
  title?: string;
  subtitle?: string;
  items: ReportLayoutMetricItem[];
  alignment?: 'left' | 'right';
}

export interface ReportLayoutHighlightsSection {
  type: 'highlights';
  title?: string;
  subtitle?: string;
  items: ReportLayoutMetricItem[];
}

export interface ReportLayoutTableColumn {
  field: string;
  header: string;
  format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
}

export interface ReportLayoutTableSection {
  type: 'table';
  title?: string;
  subtitle?: string;
  maxRows?: number;
  columns?: ReportLayoutTableColumn[];
}

export interface ReportLayoutTextSection {
  type: 'text';
  title?: string;
  content: string;
  tone?: 'default' | 'accent';
}

export type ReportLayoutSection =
  | ReportLayoutHeaderSection
  | ReportLayoutSummaryCardsSection
  | ReportLayoutCalculationsPanelSection
  | ReportLayoutHighlightsSection
  | ReportLayoutTableSection
  | ReportLayoutTextSection;

export interface ReportLayoutAsset {
  version?: string;
  theme?: ReportLayoutTheme;
  hero?: ReportLayoutHero;
  sections?: ReportLayoutSection[];
}

export interface ReportDefinition extends ReportSummary {
  TemplateKind?: 'json' | 'html' | null;
  Filters: ReportFilterDefinition[];
  LayoutAsset?: ReportLayoutAsset | null;
  HtmlTemplate?: string | null;
}

export interface RuntimeColumn {
  field: string;
  header: string;
  type: string;
}

export interface RuntimePreviewResult {
  Report: {
    Id: number;
    ReportCode: string;
    DisplayName: string;
    Description?: string;
    StoredProcedure: string;
    TemplateName: string;
    TemplatePath: string;
    ViewerType?: string;
    PaperWidth?: number;
    PaperHeight?: number;
    Orientation?: string;
    IsThermal: boolean;
    IsLandscape: boolean;
    CanView: boolean;
    CanPrint: boolean;
    ExportPdf: boolean;
    ExportExcel: boolean;
  };
  TemplateKind?: 'json' | 'html' | null;
  LayoutAsset?: ReportLayoutAsset | null;
  HtmlTemplate?: string | null;
  Columns: RuntimeColumn[];
  Rows: Record<string, unknown>[];
  RowCount: number;
  ExecutedAt: string;
}

export interface ReportExecutionRequest {
  OrgId: number;
  RoleId: number;
  ReportId: number;
  Filters: Record<string, string | number | boolean | null>;
}

export interface ReportPermissionSettings {
  OrgId: number;
  RoleId: number;
  ReportId: number;
  CanView: boolean;
  CanPrint: boolean;
  ExportPdf: boolean;
  ExportExcel: boolean;
}

export interface ApiEnvelope<T> {
  result: T;
  ErrorInfo?: {
    Message?: boolean;
    ErrorCode?: string | null;
    ErrorMessage?: string | null;
    ErrorType?: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportCatalogService {
  private readonly controllerPath = 'ReportCatalog';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  getCategories(orgId: number, roleId: number): Observable<ApiEnvelope<ReportCategorySummary[]>> {
    return this.http.get<ApiEnvelope<ReportCategorySummary[]>>(
      `${this.baseUrl}/${this.controllerPath}/GetCategories?OrgId=${orgId}&RoleId=${roleId}`
    );
  }

  getReports(orgId: number, roleId: number, categoryId?: number | null): Observable<ApiEnvelope<ReportSummary[]>> {
    const categoryQuery = categoryId ? `&CategoryId=${categoryId}` : '';
    return this.http.get<ApiEnvelope<ReportSummary[]>>(
      `${this.baseUrl}/${this.controllerPath}/GetReports?OrgId=${orgId}&RoleId=${roleId}${categoryQuery}`
    );
  }

  getReportDefinition(orgId: number, roleId: number, reportId: number): Observable<ApiEnvelope<ReportDefinition | null>> {
    return this.http.get<ApiEnvelope<ReportDefinition | null>>(
      `${this.baseUrl}/${this.controllerPath}/GetReportDefinition?OrgId=${orgId}&RoleId=${roleId}&ReportId=${reportId}`
    );
  }

  getReportPermissions(orgId: number, roleId: number): Observable<ApiEnvelope<ReportPermissionSettings[]>> {
    return this.http.get<ApiEnvelope<ReportPermissionSettings[]>>(
      `${this.baseUrl}/${this.controllerPath}/GetReportPermissions?OrgId=${orgId}&RoleId=${roleId}`
    );
  }

  saveReportPermissions(payload: ReportPermissionSettings[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/SaveReportPermission`,
      payload
    );
  }

  previewReport(payload: ReportExecutionRequest): Observable<ApiEnvelope<RuntimePreviewResult>> {
    return this.http.post<ApiEnvelope<RuntimePreviewResult>>(
      `${this.baseUrl}/ReportRuntime/Preview`,
      payload
    );
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
