import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface ComboMenu {
  Id?: number;
  RowNumber?: number;
  Code?: string;
  Name?: string;
  CategoryId?: number;
  SubCategoryId?: number | null;
  Price?: number | null;
  OrgId?: number;
  IsActive?: boolean;
  Status?: string;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
  ComboMenuItems?: ComboMenuItem[];
  comboMenuItems?: ComboMenuItem[];
  Items?: ComboMenuItem[];
}

export interface ComboMenuItem {
  Id?: number;
  ComboMenuId?: number;
  FoodMenuId: number;
  Qty: number;
  Price?: number | null;
  OrgId?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ComboMenuService {
  private readonly controllerPath = 'ComboMenu';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: ComboMenu): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: ComboMenu): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgid: number): Observable<ApiListResponse<ComboMenu>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<ComboMenu>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllComboMenu`,
      { params }
    );
  }

  getById(id: number | string): Observable<any> {
    const params = new HttpParams().set('Id', id.toString());

    return this.http.get<any>(
      `${this.baseUrl}/${this.controllerPath}/GetComboMenubyId`,
      { params }
    );
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










