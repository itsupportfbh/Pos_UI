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
  ReservationFromtime: string;
  ReservationTotime: string;
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
  BranchId?: number;
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

  async createOffline(
    reservation: Reservation
  ): Promise<any> {

    const sql = `
    INSERT INTO Reservation
    (
      ReservationNo,
      CustomerName,
      CustomerMobile,
      ReservationDate,
      ReservationFromtime,
      ReservationTotime,
      TableName,
      CustomerEmail,
      Guestcount,
      Specialrequests,
      Bookingsource,
      OrgId,
      BranchId,
      IsActive,
      IsDeleted,
      CreatedDate
    )
    VALUES
    (
      ?,?,?,?,?,?,?,?,?,?,
      ?,?,?,1,0,datetime('now')
    )
  `;

    const stmtResult =
      await this.query(sql, [
        reservation.ReservationNo,
        reservation.CustomerName,
        reservation.CustomerMobile,
        reservation.ReservationDate,
        reservation.ReservationFromtime,
        reservation.ReservationTotime,
        reservation.TableName,
        reservation.CustomerEmail,
        reservation.Guestcount,
        reservation.Specialrequests,
        reservation.Bookingsource,
        reservation.OrgId,
        reservation.BranchId
      ]);

    return stmtResult;
  }

  update(payload: Reservation): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  async updateOffline(
    reservation: Reservation
  ): Promise<any> {

    const sql = `
    UPDATE Reservation
    SET
      CustomerName=?,
      CustomerMobile=?,
      ReservationDate=?,
      ReservationFromtime=?,
      ReservationTotime=?,
      TableName=?,
      CustomerEmail=?,
      Guestcount=?,
      Specialrequests=?,
      Bookingsource=?,
      UpdatedDate=datetime('now')
    WHERE Id=?
  `;

    return await this.query(sql, [
      reservation.CustomerName,
      reservation.CustomerMobile,
      reservation.ReservationDate,
      reservation.ReservationFromtime,
      reservation.ReservationTotime,
      reservation.TableName,
      reservation.CustomerEmail,
      reservation.Guestcount,
      reservation.Specialrequests,
      reservation.Bookingsource,
      reservation.Id
    ]);
  }

  getAll(orgid: number): Observable<ApiListResponse<Reservation>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<Reservation>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllReservation`,
      { params }
    );
  }

  async getAllOffline(orgId: number): Promise<Reservation[]> {
    debugger;
    const sql = `
    SELECT
      Id,
      ReservationNo,
      CustomerName,
      CustomerMobile,
      ReservationDate,
      ReservationFromtime,
      ReservationTotime,      
      CustomerEmail,
      Guestcount,
      Specialrequests,
      Bookingsource,
      OrgId,
      BranchId,      
      IsDeleted
    FROM Reservations
    WHERE
      OrgId = ?
      AND IsDeleted = 0
    ORDER BY Id DESC
  `;

    const result = await this.query(sql, [orgId]);
    return result.values ?? [];
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetReservationbyId?Id=${id}`);
  }

  async getByIdOffline(id: number): Promise<any> {

    const sql = `
    SELECT *
    FROM Reservation
    WHERE Id = ?
    LIMIT 1
  `;

    const result = await this.query(sql, [id]);

    return result.values?.[0] ?? null;
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
  }

  async deleteOffline(id: number): Promise<any> {

    const sql = `
    UPDATE Reservation
    SET
      IsDeleted = 1,
      UpdatedDate = datetime('now')
    WHERE Id = ?
  `;

    return await this.query(sql, [id]);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  async activeInactiveOffline(
    id: number,
    isActive: boolean
  ): Promise<any> {

    const sql = `
    UPDATE Reservation
    SET IsActive = ?
    WHERE Id = ?
  `;

    return await this.query(sql, [
      isActive ? 1 : 0,
      id
    ]);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return await window.electronAPI.executeQuery(sql, params);
  }
}