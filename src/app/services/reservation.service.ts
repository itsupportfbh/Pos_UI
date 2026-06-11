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

    const duplicate = await this.query(
      `SELECT Id
     FROM Reservations
     WHERE lower(trim(ReservationNo)) = lower(trim(?))
       AND OrgId = ?
       AND IsDeleted = 0`,
      [
        reservation.ReservationNo,
        reservation.OrgId
      ]
    );

    if (duplicate.values?.length) {
      return { message: 'AlreadyExists' };
    }

    await this.query(
      `
    INSERT INTO Reservations
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
      CreatedBy,
      CreatedDate
    )
    VALUES
    (
      ?,?,?,?,?,?,?,?,?,?,
      ?,?,?,1,0,?,datetime('now')
    )
    `,
      [
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
        reservation.BranchId,
        reservation.CreatedBy ?? 1
      ]
    );

    const inserted = await this.query(
      `SELECT last_insert_rowid() as Id`
    );

    const reservationId = inserted.values[0].Id;

    if (reservation.TableIds?.length) {

      for (const tbl of reservation.TableIds) {

        await this.query(
          `
        INSERT INTO ReservationTablesMapping
        (
          ReservationId,
          TableId,
          IsReserved,
          OrgId,
          BranchId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?, ?, 1, ?, ?, 0, ?, datetime('now')
        )
        `,
          [
            reservationId,
            tbl.TableId,
            reservation.OrgId,
            reservation.BranchId,
            reservation.CreatedBy ?? 1
          ]
        );

        await this.query(
          `
        UPDATE DiningTableMaster
        SET IsOccupied = 1
        WHERE Id = ?
        `,
          [tbl.TableId]
        );
      }
    }

    return {
      result: reservationId
    };
  }

  update(payload: Reservation): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  async updateOffline(
    reservation: Reservation
  ): Promise<any> {

    await this.query(
      `
    UPDATE Reservations
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
      UpdatedBy=?,
      UpdatedDate=datetime('now')
    WHERE Id=?
    `,
      [
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
        reservation.UpdatedBy ?? 1,
        reservation.Id
      ]
    );

    const oldMappings = await this.query(
      `
    SELECT TableId
    FROM ReservationTablesMapping
    WHERE ReservationId = ?
      AND IsDeleted = 0
    `,
      [reservation.Id]
    );

    for (const row of oldMappings.values ?? []) {

      await this.query(
        `
      UPDATE DiningTableMaster
      SET IsOccupied = 0
      WHERE Id = ?
      `,
        [row.TableId]
      );
    }

    await this.query(
      `
    UPDATE ReservationTablesMapping
    SET IsDeleted = 1
    WHERE ReservationId = ?
    `,
      [reservation.Id]
    );

    if (reservation.TableIds?.length) {

      for (const tbl of reservation.TableIds) {

        await this.query(
          `
        INSERT INTO ReservationTablesMapping
        (
          ReservationId,
          TableId,
          IsReserved,
          OrgId,
          BranchId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?, ?, 1, ?, ?, 0, ?, datetime('now')
        )
        `,
          [
            reservation.Id,
            tbl.TableId,
            reservation.OrgId,
            reservation.BranchId,
            reservation.UpdatedBy ?? 1
          ]
        );

        await this.query(
          `
        UPDATE DiningTableMaster
        SET IsOccupied = 1
        WHERE Id = ?
        `,
          [tbl.TableId]
        );
      }
    }

    return {
      result: reservation.Id
    };
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

    const reservation = await this.query(
      `
    SELECT *
    FROM Reservations
    WHERE Id = ?
    `,
      [id]
    );

    if (!reservation.values?.length) {
      return null;
    }

    const tables = await this.query(
      `
    SELECT TableId
    FROM ReservationTablesMapping
    WHERE ReservationId = ?
      AND IsDeleted = 0
    `,
      [id]
    );

    const data = reservation.values[0];

    data.TableIds = tables.values ?? [];

    return data;
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
  }

  async deleteOffline(id: number): Promise<any> {

    const mappings = await this.query(
      `
    SELECT TableId
    FROM ReservationTablesMapping
    WHERE ReservationId = ?
      AND IsDeleted = 0
    `,
      [id]
    );

    for (const row of mappings.values ?? []) {

      await this.query(
        `
      UPDATE DiningTableMaster
      SET IsOccupied = 0
      WHERE Id = ?
      `,
        [row.TableId]
      );
    }

    await this.query(
      `
    UPDATE ReservationTablesMapping
    SET IsDeleted = 1
    WHERE ReservationId = ?
    `,
      [id]
    );

    await this.query(
      `
    UPDATE Reservations
    SET IsDeleted = 1,
        UpdatedDate = datetime('now')
    WHERE Id = ?
    `,
      [id]
    );

    return {
      success: true
    };
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