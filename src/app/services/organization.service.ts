import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Organization {
  Id?: number;
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


  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}






