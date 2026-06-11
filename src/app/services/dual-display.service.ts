import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface DualDisplay {
  Id?: number;
  ProfileCode?: string;
  ProfileName?: string;
  OrgId?: number;
  OrgName?: string;
  BranchId?: number;
  BranchName?: string;
  CounterId?: number;
  CounterName?: string;
  ThemeName?: string;
  HeaderTitle?: string;
  WelcomeMessage?: string;
  IdleMessage?: string;
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
export class DualDisplayService {
  private readonly controllerPath = 'DualDisplay';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: DualDisplay): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: DualDisplay): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgId: number): Observable<ApiListResponse<DualDisplay>> {
    return this.http.get<ApiListResponse<DualDisplay>>(`${this.baseUrl}/${this.controllerPath}/GetAll?orgId=${orgId}`);
  }

  getActiveProfile(orgId: number, branchId: number, counterId = 0): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${this.controllerPath}/GetActiveProfile?orgId=${orgId}&branchId=${branchId}&counterId=${counterId}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetById?id=${id}`);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/Delete?id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?id=${id}&isActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}










