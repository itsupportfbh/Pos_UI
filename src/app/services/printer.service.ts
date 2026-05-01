import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Printer {
  Id?: number;
  Code?: string;
  Name?: string;
  BranchId?: number;
  CounterId?: number;
  TerminalId?: number;
  BranchName?: string;
  CounterName?: string;
  TerminalName?: string;
  Remarks?: string;
  OrgId?: number;
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
export class PrinterService {
  private readonly controllerPath = 'Printer';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  create(payload: Printer): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.controllerPath}/Create`,
      payload
    );
  }

  update(payload: Printer): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/${this.controllerPath}/Update`,
      payload
    );
  }

  getAll(orgId: number, branchId: number, counterId: number, terminalId: number): Observable<ApiListResponse<Printer>> {
    return this.http.get<ApiListResponse<Printer>>(
      `${this.baseUrl}/${this.controllerPath}/GetAll?orgId=${orgId}&branchId=${branchId}&counterId=${counterId}&terminalId=${terminalId}`
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${this.controllerPath}/GetById?id=${id}`
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









