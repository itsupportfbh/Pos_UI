import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Menu {
    Id?: number;
    code?: string;
    name?: string;
    categoryId?: number;
    subCategoryId?: number;
    price: number;
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

export interface MenuStatusRequest {
    id: number | string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class MenuService {
    private readonly controllerPath = 'FoodMenu';

    constructor(
        private readonly http: HttpClient,
        private readonly runtimeConfig: RuntimeConfigService
    ) { }

    create(payload: Menu): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/${this.controllerPath}/Create`,
            payload
        );
    }

    update(payload: Menu): Observable<any> {
        return this.http.put<any>(
            `${this.baseUrl}/${this.controllerPath}/Update`,
            payload
        );
    }

    getAll(orgid: number): Observable<ApiListResponse<Menu>> {
        const params = new HttpParams().set('orgid', orgid.toString());

        return this.http.get<ApiListResponse<Menu>>(
            `${this.baseUrl}/${this.controllerPath}/GetAllMenu`,
            { params }
        );
    }

    getById(id: number | string): Observable<Menu> {
        const params = new HttpParams().set('Id', id.toString());

        return this.http.get<Menu>(
            `${this.baseUrl}/${this.controllerPath}/GetMenubyId`,
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









