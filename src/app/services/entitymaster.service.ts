import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class EntityMasterService {
  private readonly controllerPath = 'EntityMaster';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  GetEntityMasterForRoleRights(OrgId: number, roleId: number): Observable<ApiListResponse<any>> {
    return this.http.get<ApiListResponse<any>>(
      `${this.baseUrl}/${this.controllerPath}/GetEntityMasterForRoleRights?OrgId=${OrgId}&RoleId=${roleId}`
    );
  }

  SaveRolePermission(payload: any[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/SaveRolePermission`,
      payload
    );
  }

   GetRoleRightsByRoleId(OrgId: number, roleId: number, EntityNo: number): Observable<ApiListResponse<any>> {
    return this.http.get<ApiListResponse<any>>(
      `${this.baseUrl}/${this.controllerPath}/GetRoleRightsByRoleId?OrgId=${OrgId}&RoleId=${roleId}&EntityNo=${EntityNo}`
    );
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
