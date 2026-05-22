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
    imageFile?: File | null;
    remarks: string;     
    displayOrder: number;
    orgId: number;
    isActive?: boolean;
    createdBy: number | null;
    createdDate?: string;
    updatedBy: number | null;
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

        const formData = new FormData();
        formData.append('Id', (payload.id ?? 0).toString());
        formData.append('Code', payload.code);
        formData.append('Name', payload.name);
        formData.append('SeatingSize', payload.seatingSize.toString());
        formData.append('BranchId', payload.branchId.toString());
        formData.append('FloorId', payload.floorId.toString());
        formData.append('Image', payload.image ?? '');
        formData.append('Remarks', payload.remarks ?? '');
        formData.append('DisplayOrder', payload.displayOrder.toString());
        formData.append('OrgId', payload.orgId.toString());
        formData.append('IsActive', (payload.isActive ?? true).toString());
        formData.append('CreatedBy', (payload.createdBy ?? 0).toString());
        formData.append('CreatedDate', payload.createdDate ?? new Date().toISOString());
        formData.append('UpdatedBy', (payload.updatedBy ?? 0).toString());
        formData.append('UpdatedDate', payload.updatedDate ?? new Date().toISOString());
        formData.append('IsDeleted', (payload.isDeleted ?? false).toString());
        
        if (payload.imageFile) {
            formData.append('ImageFile', payload.imageFile);
        }

        console.log('FormData entries:', Array.from(formData.entries()));

        return this.http.post<any>(
            `${this.baseUrl}/${this.controllerPath}/Create`,
            formData
        );
    }

    update(payload: DiningTable): Observable<any> {
        const formData = new FormData();
        formData.append('Id', (payload.id ?? 0).toString());
        formData.append('Code', payload.code);
        formData.append('Name', payload.name);
        formData.append('SeatingSize', payload.seatingSize.toString());
        formData.append('BranchId', payload.branchId.toString());
        formData.append('FloorId', payload.floorId.toString());
        formData.append('Image', payload.image ?? '');
        formData.append('Remarks', payload.remarks ?? '');
        formData.append('DisplayOrder', payload.displayOrder.toString());
        formData.append('OrgId', payload.orgId.toString());
        formData.append('IsActive', (payload.isActive ?? true).toString());
        formData.append('CreatedBy', (payload.createdBy ?? 0).toString());
        formData.append('CreatedDate', payload.createdDate ?? new Date().toISOString());
        formData.append('UpdatedBy', (payload.updatedBy ?? 0).toString());
        formData.append('UpdatedDate', payload.updatedDate ?? new Date().toISOString());
        formData.append('IsDeleted', (payload.isDeleted ?? false).toString());
        
        if (payload.imageFile) {
            formData.append('ImageFile', payload.imageFile);
        }

        console.log('FormData entries for update:', Array.from(formData.entries()));

        return this.http.put<any>(
            `${this.baseUrl}/${this.controllerPath}/Update`,
            formData
        );
    }

    getAll(orgid: number, branchid?: number): Observable<ApiListResponse<DiningTable>> {
        let params = new HttpParams().set('orgid', orgid.toString());

        if (branchid !== undefined && branchid > 0) {
            params = params.set('branchid', branchid.toString());
        }

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
