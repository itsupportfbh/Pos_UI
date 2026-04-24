import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface UserMaster {
  Id?: number;
  Code?: string;
  Name?: string;
  EmpCode?: string;
  Email?: string;
  ContactNumber?: string;
  Gender?: number;
  DateOfBirth?: string | null;
  Age?: number;
  IsAdmin?: boolean;
  Address1?: string;
  Address2?: string;
  Country?: number;
  State?: number;
  City?: number;
  PostalCode?: string;
  Image?: string;
  Remarks?: string;
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
export class UserMasterService {
  private readonly controllerPath = 'UserMaster';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: UserMaster): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: UserMaster): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(): Observable<ApiListResponse<UserMaster>> {
    return this.http.get<ApiListResponse<UserMaster>>(`${this.baseUrl}/${this.controllerPath}/GetAll`);
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetById?Id=${id}`);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
