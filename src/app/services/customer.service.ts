import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Customer {
  Id?: number;
  Code?: string;
  Name?: string;
  MobileNo?: string;
  EmailId?: string;
  AddressLine1?: string;
  CityId?: number | null;
  StateId?: number | null;
  CountryId?: number | null;
  Pincode?: string;
  DateOfBirth?: string | null;
  Gender?: string;
  MemberNo?: string;
  OpeningBalance?: number;
  IsMember?: boolean;
  Remarks?: string;
  OrgId?: number;
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
export class CustomerService {
  private readonly controllerPath = 'Customer';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Customer): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Customer): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgId: number): Observable<ApiListResponse<Customer>> {
    return this.http.get<ApiListResponse<Customer>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllCustomer?orgId=${orgId}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetCustomerbyId?id=${id}`);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}









