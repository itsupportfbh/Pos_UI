import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface UserMaster {
  Id?: number;
  Code?: string;
  Name?: string;
  Remarks?: string;
  IsAdmin?: boolean;
  EmpCode?: string;
  Email?: string;
  Password?: string;
  ContactNo?: number;
  OrgId?: number;
  Image?: string;
  Gender?: number;
  DOB?: string | null;
  Age?: number;
  Address1?: string;
  Address2?: string;
  City?: number;
  State?: number;
  Country?: number;
  PostalCode?: string;
  ImageFile?: File | null;
  UserBranchMapping?: UserBranchMapping[];
  UserRoleMapping?: UserRoleMapping[];
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface UserBranchMapping {
  Id?: number;
  UserId?: number;
  BranchId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

export interface UserRoleMapping {
  Id?: number;
  UserId?: number;
  RoleId?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserMasterService {
  private readonly controllerPath = 'UserMaster';
  private readonly userRoleMappingControllerPath = 'UserRoleMapping';
  private readonly userBranchMappingControllerPath = 'UserBranchMapping';



  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(OrgId: number): Observable<ApiListResponse<UserMaster>> {
    return this.http.get<ApiListResponse<UserMaster>>(`${this.baseUrl}/${this.controllerPath}/GetAllUsers?OrgId=${OrgId}`);
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

   getuserBranchesByUserId(UserId: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.userBranchMappingControllerPath}/GetByUserId?UserId=${UserId}`);
  }

   getuserRolesByUserId(UserId: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.userRoleMappingControllerPath}/GetByUserId?UserId=${UserId}`);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
