import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface Organization {
  id?: number | string;
  code?: string;
  name?: string;
  companyName?: string;
  gstNumber?: string;
  registrationNumber?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  remarks?: string;
  branch?: string;
  status?: string;
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
    return this.http.post<Organization>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Organization): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.baseUrl}/${this.controllerPath}/GetAllOrganization`);
  }

  getById(id: number | string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${this.controllerPath}/GetById/${id}`);
  }


  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.controllerPath}/Delete/${id}`);
  }

  activeInActive(payload: OrganizationStatusRequest): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive`, payload);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
