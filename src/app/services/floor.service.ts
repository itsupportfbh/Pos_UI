import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Floor {
  Id?: number;
  Code?: string;
  Name?: string;
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

@Injectable({
  providedIn: 'root'
})
export class FloorService {
  private readonly controllerPath = 'Floor';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Floor): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Floor): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgId: number,branchid:number): Observable<ApiListResponse<Floor>> {
    return this.http.get<ApiListResponse<Floor>>(
      `${this.baseUrl}/${this.controllerPath}/GetAll?orgid=${orgId}&branchid=${branchid}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetbyId?id=${id}`);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
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
