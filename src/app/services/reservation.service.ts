import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface Reservation {
  Id?: number;
  ReservationNo: string;
  CustomerName: string;
  CustomerMobile: string;
  ReservationDate: string;
  Reservationtime: string;
  TableName: string;
  CustomerEmail: string;
  Guestcount: number;
  Specialrequests: string;
  TableIds?: Array<{ TableId: number }>;
  Bookingsource?: string;
  OrgId?: number;
  IsActive?: boolean;  
  CreatedBy?: number | null;
  CreatedDate?: string;
  UpdatedBy?: number | null;
  UpdatedDate?: string | null;
  IsDeleted?: boolean;
  EntityNo?: number;
  branchId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private readonly controllerPath = 'Reservation';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: Reservation): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: Reservation): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgid: number): Observable<ApiListResponse<Reservation>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<Reservation>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllReservation`,
      { params }
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetReservationbyId?Id=${id}`);
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