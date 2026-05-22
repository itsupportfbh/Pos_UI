import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Category {
  Id?: number;
  code?: string;
  name?: string;
  OrgId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
  EntityNo?: number;
  BranchId?: number;
}

export interface CategoryStatusRequest {
  id: number | string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly controllerPath = 'Category';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Category): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: Category): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgid: number): Observable<ApiListResponse<Category>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<Category>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllCategory`,
      { params }
    );
  }

  getById(id: number | string): Observable<Category> {
    const params = new HttpParams().set('Id', id.toString());

    return this.http.get<Category>(
      `${this.baseUrl}/${this.controllerPath}/GetCategorybyId`,
      { params }
    );
  }

 delete(id: number | string): Observable<any> {
  return this.http.delete<any>(
    `${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`
  );
}
  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}









