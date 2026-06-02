import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface OrderScreen {
  Id?: number;
  RowNumber?: number;
  Code?: string;
  Name?: string;
  Remarks?: string;
  IsActive?: boolean;
  Status?: string;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface OrderScreenMenuItem {
  id?: number;
  code?: string;
  name?: string;
  categoryId?: number;
  categoryName?: string;
  category?: string;
  subCategoryId?: number;
  subCategoryName?: string;
  subCategory?: string;
  price?: number;
  orgid?: number;
  branchid?: number;
  isactive?: boolean;
  type?: 'Menu' | 'ComboMenu' | string;
  comboMenuItems?: any[];
  itemsCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderScreenService {
  private readonly controllerPath = 'OrderScreen';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: OrderScreen): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: OrderScreen): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(): Observable<ApiListResponse<OrderScreen>> {
    return this.http.get<ApiListResponse<OrderScreen>>(`${this.baseUrl}/${this.controllerPath}/GetAll`);
  }

  getTopSixMenuAndComboMenu(orgid: number, branchid: number): Observable<ApiListResponse<OrderScreenMenuItem>> {
    const params = new HttpParams()
      .set('orgid', orgid.toString())
      .set('branchid', branchid.toString());

    return this.http.get<ApiListResponse<OrderScreenMenuItem>>(
      `${this.baseUrl}/Orders/GetTopSixMenuAndComboMenu`,
      { params }
    );
  }

  getAllMenuAndComboMenu(
    orgid: number,
    branchid: number,
    categoryId: number | null = null,
    subCategoryId: number | null = null,
    searchKey = ''
  ): Observable<ApiListResponse<OrderScreenMenuItem>> {
    let params = new HttpParams()
      .set('orgid', orgid.toString())
      .set('branchid', branchid.toString())
      .set('searchKey', searchKey);

    if (categoryId && categoryId > 0) {
      params = params.set('categoryId', categoryId.toString());
    }

    if (subCategoryId && subCategoryId > 0) {
      params = params.set('subCategoryId', subCategoryId.toString());
    }

    return this.http.get<ApiListResponse<OrderScreenMenuItem>>(
      `${this.baseUrl}/Orders/GetAllMenuAndComboMenu`,
      { params }
    );
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










