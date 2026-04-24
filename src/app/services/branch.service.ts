import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

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

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly controllerPath = 'Branch';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Branch): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: Branch): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgid: number): Observable<ApiListResponse<Branch>> {

    return this.http.get<ApiListResponse<Branch>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllBranch?orgid=${orgid}`
    );
  }

  getById(id: number | string): Observable<any> {

    return this.http.get<any>(
      `${this.baseUrl}/${this.controllerPath}/GetBranchbyId?id=${id}`
    );
  }

 delete(id: number | string): Observable<any> {
  return this.http.delete<any>(
    `${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`
  );
}
  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    const params = new HttpParams()
      .set('Id', id.toString())
      .set('IsActive', isActive.toString());

    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/ActiveInActive`,
      {},
      { params }
    );
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
