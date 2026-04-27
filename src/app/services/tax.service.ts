import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service'; 

export interface Tax {
    Id?: number;
    code?: string;
    name?: string;
    percentage: number;
    OrgId?: number;
    IsActive?: boolean;
    CreatedBy?: number | null;
    CreatedDate?: string;
    UpdatedBy?: number | null;
    UpdatedDate?: string | null;
    IsDeleted?: boolean;
}

export interface TaxStatusRequest {
    id: number | string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TaxService {
    private readonly controllerPath = 'Tax';

    constructor(
        private readonly http: HttpClient,
        private readonly runtimeConfig: RuntimeConfigService
    ) { }

    create(payload: Tax): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/${this.controllerPath}/Create`,
            payload
        );
    }

    update(payload: Tax): Observable<any> {
        return this.http.put<any>(
            `${this.baseUrl}/${this.controllerPath}/Update`,
            payload
        );
    }

    getAll(orgid: number): Observable<ApiListResponse<Tax>> {
        const params = new HttpParams().set('orgid', orgid.toString());

        return this.http.get<ApiListResponse<Tax>>(
            `${this.baseUrl}/${this.controllerPath}/GetAllTax`,
            { params }
        );
    }

    getById(id: number | string): Observable<Tax> {
        const params = new HttpParams().set('Id', id.toString());

        return this.http.get<Tax>(
            `${this.baseUrl}/${this.controllerPath}/GetTaxById`,
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