import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Role {
  Id?: number;
  Code?: string;
  Name?: string;
  Remarks?: string;
  OrgId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
  EntityNo?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly controllerPath = 'RoleMaster';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Role): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: Role): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgid: number): Observable<ApiListResponse<Role>> {
    return this.http.get<ApiListResponse<Role>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllRole?orgid=${orgid}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${this.controllerPath}/GetRoleById?Id=${id}`
    );
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`
    );
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}









