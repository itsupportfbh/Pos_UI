import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Counter {
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
}

export interface CounterStatusRequest {
  id: number | string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CounterService {
  private readonly controllerPath = 'Branch';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Counter): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: Counter): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgid: number): Observable<ApiListResponse<Counter>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<Counter>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllCounter`,
      { params }
    );
  }

  getById(id: number | string): Observable<Counter> {
    const params = new HttpParams().set('Id', id.toString());

    return this.http.get<Counter>(
      `${this.baseUrl}/${this.controllerPath}/GetCounterbyId`,
      { params }
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