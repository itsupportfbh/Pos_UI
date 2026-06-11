import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface employee {
  Id?: number;
  Code?: string;
  Name?: string;
  Phone?: string;
  BranchId?: number;
  Remarks?: string;
  OrgId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
  DepartmentId?: number | 0;
  DesignationId?: number | 0;
  MobileNo?: string;
  EmailId?: string;
  AddressLine1?: string;
  Gender?: string;
  IdProofNo?: string;
}



export interface employeeRequest {
  id: number | string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  getBranches(arg0: number) {
    throw new Error('Method not implemented.');
  }
  private readonly controllerPath = 'Employee';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: employee): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: employee): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgId: number, branchId: number | string): Observable<ApiListResponse<employee>> {
    return this.http.get<ApiListResponse<employee>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllEmployee?orgId=${orgId}&branchId=${branchId}`
    );
  }

  async getAllOffline(
    orgId: number,
    branchId: number | string
  ): Promise<employee[]> {
    debugger;
    let sql = `
    SELECT
      e.Id,
      o.Name AS OrganizationName,
      e.Code,
      e.Name,
      e.MobileNo,
      e.EmailId,
      COALESCE(e.DesignationId, 0) AS DesignationId,
      COALESCE(e.DepartmentId, 0) AS DepartmentId,
      e.DateOfJoining,
      COALESCE(e.BranchId, 0) AS BranchId,
      b.Name AS BranchName,
      e.Gender,
      e.AddressLine1,
      e.IdProofNo,
      e.Remarks,
      e.OrgId,
      e.IsActive,
      e.IsDeleted
    FROM EmployeeMaster e
    INNER JOIN Branch b
      ON e.BranchId = b.Id
    INNER JOIN Organization o
      ON e.OrgId = o.Id
    WHERE
      e.IsDeleted = 0
      AND (? = 0 OR e.OrgId = ?)
  `;

    const params: any[] = [orgId, orgId];

    if (branchId && branchId !== '0' && branchId !== 0) {

      const branchIds = String(branchId)
        .split(',')
        .map(x => Number(x.trim()))
        .filter(x => !isNaN(x));

      const placeholders =
        branchIds.map(() => '?').join(',');

      sql += `
      AND e.BranchId IN (${placeholders})
    `;

      params.push(...branchIds);
    }

    sql += `
    ORDER BY e.Name
  `;
    console.log(sql);
    const result =
      await this.query(sql, params);
    console.log(result);
    return result.values ?? [];
  }

  getMultiAll(orgId: number, branchIds: number[]): Observable<ApiListResponse<employee>> {
    const branchId = branchIds?.length ? branchIds.join(',') : 0;

    return this.http.get<ApiListResponse<employee>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllCounter?orgId=${orgId}&branchId=${branchId}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetCounterbyId?id=${id}`);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/Delete?id=${id}`);
  }
  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return await window.electronAPI.executeQuery(sql, params);
  }
}









