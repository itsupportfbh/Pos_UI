import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';  

export interface Terminal {
    Id?: number;
    code?: string;
    name?: string;
    branchId?: number;
    counterId?: number;
    deviceName?: string;
    OrgId?: number;
    IsActive?: boolean;
    CreatedBy?: number | null;
    CreatedDate?: string;
    UpdatedBy?: number | null;
    UpdatedDate?: string | null;
    IsDeleted?: boolean;
    EntityNo?: number;
}

export interface TerminalStatusRequest {
    id: number | string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TerminalService {
    private readonly controllerPath = 'Terminal';

    constructor(
        private readonly http: HttpClient,
        private readonly runtimeConfig: RuntimeConfigService
    ) { }

    create(payload: Terminal): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/${this.controllerPath}/Create`,
            payload
        );
    }

    update(payload: Terminal): Observable<any> {
        return this.http.put<any>(
            `${this.baseUrl}/${this.controllerPath}/Update`,
            payload
        );
    }

    getAll(orgid: number, branchId: number, counterId: number): Observable<ApiListResponse<Terminal>> {
        const params = new HttpParams().
        set('orgid', orgid.toString())
        .set('branchid', branchId.toString())
        .set('counterid', counterId.toString());

        return this.http.get<ApiListResponse<Terminal>>(
            `${this.baseUrl}/${this.controllerPath}/GetAllTerminal`,
            { params }
        );
    }

    getById(id: number | string): Observable<Terminal> {
        const params = new HttpParams().set('Id', id.toString());

        return this.http.get<Terminal>(
            `${this.baseUrl}/${this.controllerPath}/GetTerminalById`,
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









