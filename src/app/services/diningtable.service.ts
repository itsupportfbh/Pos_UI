import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';
import { subCategory } from './SubCategory.service';

export interface DiningTable {
    id?: number;
    code: string;
    name: string;
    seatingSize: number;
    branchId: number;
    floorId: number;
    image?: string;
    remarks: string;     
    displayOrder: number;
    orgId: number;
    isActive?: boolean;
    createdBy?: string;
    createdDate?: string;
    updatedBy?: string;
    updatedDate?: string;
    isDeleted?: boolean;
}

export interface DiningTableStatusRequest {
    id: number | string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class DiningTableService {
    private readonly controllerPath = 'Tables';

    constructor(
        private readonly http: HttpClient,
        private readonly runtimeConfig: RuntimeConfigService
    ) { }

    create(payload: DiningTable): Observable<any> {
        console.log('Creating dining table with payload:', payload);
        return this.http.post<any>(
            `${this.baseUrl}/${this.controllerPath}/Create`,
            payload
        );
    }

    update(payload: DiningTable): Observable<any> {
        return this.http.put<any>(
            `${this.baseUrl}/${this.controllerPath}/Update`,
            payload
        );
    }

    getAll(orgid: number): Observable<ApiListResponse<DiningTable>> {
        const params = new HttpParams().set('orgid', orgid.toString());

        return this.http.get<ApiListResponse<DiningTable>>(
            `${this.baseUrl}/${this.controllerPath}/GetAllTable`,
            { params }
        );
    }

    getById(id: number | string): Observable<DiningTable> {
        const params = new HttpParams().set('Id', id.toString());

        return this.http.get<DiningTable>(
            `${this.baseUrl}/${this.controllerPath}/GetTableById`,
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
