import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Organization {
  Id?: number;
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
  private readonly controllerPath = 'organization';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: Organization): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/${this.controllerPath}/Create`, payload, {
      headers: this.getHeaders()
    });
  }

  update(payload: Organization): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${this.controllerPath}/Update`, payload, {
      headers: this.getHeaders()
    });
  }

  getAll(): Observable<ApiListResponse<Organization>> {
    return this.http.get<ApiListResponse<Organization>>(`${this.baseUrl}/${this.controllerPath}/GetAllOrganization`, {
      headers: this.getHeaders()
    });
  }

  getById(id: number | string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${this.controllerPath}/GetById?Id=${id}`, {
      headers: this.getHeaders()
    });
  }


  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`, {
      headers: this.getHeaders()
    });
  }

  activeInActive(id: number | string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {}, {
      headers: this.getHeaders()
    });
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  private getHeaders(): HttpHeaders {
    const loginSession = localStorage.getItem('loginSession');

    if (!loginSession) {
      return new HttpHeaders();
    }

    const session = JSON.parse(loginSession);
    const token = session.Token ?? '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
