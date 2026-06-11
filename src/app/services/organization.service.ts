import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Organization {
  Id?: number;
  EntityNo?: number;
  RowNumber?: number;
  Code?: string;
  Name?: string;
  GSTNo?: string;
  RegistrationNo?: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  ContactPerson?: string;
  ContactMobileNo?: string;
  ContactEmail?: string;
  Address1?: string;
  Address2?: string;
  City?: number;
  State?: number;
  Country?: number;
  LanguageCode?: string;
  PostalCode?: number;
  Remarks?: string;
  IsActive?: boolean;
  Status?: string;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface OrganizationConfig {
  Id: number;
  Image?: string;
  ImageFile?: File | null;
  ThemeColor?: string;
  FontSize: number;
  OrgId: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly controllerPath = 'organization';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: Organization): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Organization): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(): Observable<ApiListResponse<Organization>> {
    return this.http.get<ApiListResponse<Organization>>(`${this.baseUrl}/${this.controllerPath}/GetAllOrganization`);
  }

  getById(id: number | string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${this.controllerPath}/GetById?Id=${id}`);
  }


  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  CreateUpdateOrganizationConfig(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/CreateUpdateOrganizationConfig`, payload);
  }

  GetOrganizationConfigByOrgId(OrgId: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetOrganizationConfigByOrgId?OrgId=${OrgId}`);
  }

  CreateCodetemplate(payload: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/CodeTemplate/CreateCodetemplate`, payload);
  }

  GetAllCodeTemplate(OrgId: number | string, BranchId: number | string, IsMaster: boolean): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/CodeTemplate/GetAllCodeTemplate?OrgId=${OrgId}&BranchId=${BranchId}&IsMaster=${IsMaster}`);
  }

  GetLatestCode(EntityNo: number | string, OrgId: number | string, BranchId: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/CodeTemplate/GetLatestCode?EntityNo=${EntityNo}&OrgId=${OrgId}&BranchId=${BranchId}`);
  }

  async getLatestCodeOffline(
    entityNo: number,
    orgId: number,
    branchId: number
  ): Promise<string> {

    let sql = '';
    let params: any[] = [];

    if (entityNo === 2) {
      sql = `
      SELECT *
      FROM CodeTemplate
      WHERE
        IsDeleted = 0
        AND IsActive = 1
        AND EntityNo = ?
      ORDER BY Id DESC
      LIMIT 1
    `;

      params = [entityNo];
    } else {
      sql = `
      SELECT *
      FROM CodeTemplate
      WHERE
        IsDeleted = 0
        AND IsActive = 1
        AND EntityNo = ?
        AND OrgId = ?
        AND (
          IsMaster = 1
          OR BranchId = ?
        )
      ORDER BY Id DESC
      LIMIT 1
    `;

      params = [entityNo, orgId, branchId];
    }

    let result = await this.query(sql, params);

    let template = result.values?.[0];

    if (!template && entityNo !== 2) {

      result = await this.query(
        `
      SELECT *
      FROM CodeTemplate
      WHERE
        IsDeleted = 0
        AND IsActive = 1
        AND EntityNo = ?
        AND OrgId = 0
        AND (
          IsMaster = 1
          OR BranchId = ?
        )
      ORDER BY Id DESC
      LIMIT 1
      `,
        [entityNo, branchId]
      );

      template = result.values?.[0];
    }

    if (!template) {
      return '';
    }

    return this.buildLatestCode(template);
  }

  private buildLatestCode(codeTemplate: any): string {

    const prefix =
      (codeTemplate.Prefix ?? '').toUpperCase();

    const suffix =
      (codeTemplate.Suffix ?? '').toUpperCase();

    const startValue =
      String(codeTemplate.StartValue ?? '');

    const nextValue =
      Number(codeTemplate.CurrentValue ?? 0) + 1;

    const balanceDigits =
      Number(codeTemplate.NoOfDigit ?? 0) -
      startValue.length;

    const numericPart =
      balanceDigits > 0
        ? startValue +
        nextValue.toString().padStart(balanceDigits, '0')
        : startValue + nextValue.toString();

    if (codeTemplate.IsDateMonthYearWise) {

      const now = new Date();

      const dd =
        now.getDate().toString().padStart(2, '0');

      const mm =
        (now.getMonth() + 1)
          .toString()
          .padStart(2, '0');

      const yyyy =
        now.getFullYear();

      return `${dd}${mm}${yyyy}-${prefix}${numericPart}${suffix}`;
    }

    return `${prefix}${numericPart}${suffix}`;
  }

  async updateCodeTemplateCounter(
    entityNo: number,
    orgId: number,
    branchId: number
  ): Promise<void> {

    await this.query(
      `
    UPDATE CodeTemplate
    SET CurrentValue = CurrentValue + 1
    WHERE Id = (
      SELECT Id
      FROM CodeTemplate
      WHERE
        EntityNo = ?
        AND OrgId = ?
      LIMIT 1
    )
    `,
      [entityNo, orgId]
    );
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return await window.electronAPI.executeQuery(sql, params);
  }
}
