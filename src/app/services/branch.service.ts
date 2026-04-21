import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';
import { HttpParams } from '@angular/common/http';
export interface Branch {
  Id?: number;
  Code?: string;
  Name?: string;
  Phone?: string;
  Email?: string;
  ContactPerson?: string;
  ContactMobileNo?: string;
  ContactEmail?: string;
  Address1?: string;
  Address2?: string;
  City?: number;
  State?: number;
  PostalCode?: number;
  Country?: number;
  Remarks?: string;
  OrgId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface OrganizationStatusRequest {
  id: number | string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly controllerPath = 'Branch';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: Branch): Observable<Branch> {
    return this.http.post<Branch>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Branch): Observable<Branch> {
    return this.http.put<Branch>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgid: number): Observable<ApiListResponse<Branch>> {
  const params = new HttpParams().set('orgid', orgid);
  return this.http.get<ApiListResponse<Branch>>(
    `${this.baseUrl}/${this.controllerPath}/GetAllBranch`,
    { params }
  );
}

  getById(id: number | string): Observable<Branch> {
    return this.http.get<Branch>(`${this.baseUrl}/${this.controllerPath}/GetById?Id=${id}`);
  }


  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
