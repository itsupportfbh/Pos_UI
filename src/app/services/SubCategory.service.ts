import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface subCategory {
  Id?: number;
  code?: string;
  name?: string;
  categoryId?: number;
  OrgId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface subCategoryStatusRequest {
  id: number | string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class subCategoryService {
  private readonly controllerPath = 'SubCategory';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: subCategory): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: subCategory): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgid: number): Observable<ApiListResponse<subCategory>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<subCategory>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllSubCategory`,
      { params }
    );
  }

  getById(id: number | string): Observable<subCategory> {
    const params = new HttpParams().set('Id', id.toString());

    return this.http.get<subCategory>(
      `${this.baseUrl}/${this.controllerPath}/GetSubCategorybyId`,
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