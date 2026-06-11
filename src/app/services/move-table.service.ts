import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';
import { Reservation } from './reservation.service';

export interface MoveTable {
  Id?: number;
  MoveNo: string;
  TableDetails: MoveTableDetail[];
  GuestCount: number;
  StewardId: number;
  MoveReason: string;
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

export interface MoveTableDetail {
  FromTable: number;
  ToTable: number;
}

@Injectable({
  providedIn: 'root'
})
export class MoveTableService {
  private readonly controllerPath = 'MoveTables';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: MoveTable): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  async createOffline(
    moveTable: MoveTable
  ): Promise<any> {

    const duplicate = await this.query(
      `
    SELECT Id
    FROM MoveTables
    WHERE lower(trim(MoveNo)) = lower(trim(?))
      AND OrgId = ?
      AND IsDeleted = 0
    `,
      [
        moveTable.MoveNo,
        moveTable.OrgId
      ]
    );

    if (duplicate.values?.length) {
      return { message: 'AlreadyExists' };
    }

    await this.query(
      `
    INSERT INTO MoveTables
    (
      MoveNo,
      GuestCount,
      StewardId,
      MoveReason,
      IsActive,
      OrgId,
      IsDeleted,
      CreatedBy,
      CreatedDate
    )
    VALUES
    (
      ?,?,?,?,?,?,0,?,
      datetime('now')
    )
    `,
      [
        moveTable.MoveNo,
        moveTable.GuestCount,
        moveTable.StewardId,
        moveTable.MoveReason,
        moveTable.IsActive ? 1 : 0,
        moveTable.OrgId,
        moveTable.CreatedBy ?? 1
      ]
    );

    const inserted = await this.query(
      `SELECT last_insert_rowid() AS Id`
    );

    const moveId = inserted.values[0].Id;

    if (moveTable.TableDetails?.length) {

      for (const item of moveTable.TableDetails) {

        await this.query(
          `
        INSERT INTO MoveTabledetails
        (
          MoveNo,
          FromTable,
          ToTable,
          OrgId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?,?,?,?,0,?,
          datetime('now')
        )
        `,
          [
            moveTable.MoveNo,
            item.FromTable,
            item.ToTable,
            moveTable.OrgId,
            moveTable.CreatedBy ?? 1
          ]
        );
      }
    }

    return {
      result: moveId
    };
  }

  update(payload: MoveTable): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  async updateOffline(
    moveTable: MoveTable
  ): Promise<any> {

    await this.query(
      `
    UPDATE MoveTables
    SET
      GuestCount = ?,
      StewardId = ?,
      MoveReason = ?,
      IsActive = ?,
      UpdatedBy = ?,
      UpdatedDate = datetime('now')
    WHERE Id = ?
    `,
      [
        moveTable.GuestCount,
        moveTable.StewardId,
        moveTable.MoveReason,
        moveTable.IsActive ? 1 : 0,
        moveTable.UpdatedBy ?? 1,
        moveTable.Id
      ]
    );

    await this.query(
      `
    DELETE FROM MoveTabledetails
    WHERE MoveNo = ?
    `,
      [moveTable.MoveNo]
    );

    if (moveTable.TableDetails?.length) {

      for (const item of moveTable.TableDetails) {

        await this.query(
          `
        INSERT INTO MoveTabledetails
        (
          MoveNo,
          FromTable,
          ToTable,
          OrgId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?,?,?,?,0,?,
          datetime('now')
        )
        `,
          [
            moveTable.MoveNo,
            item.FromTable,
            item.ToTable,
            moveTable.OrgId,
            moveTable.UpdatedBy ?? 1
          ]
        );
      }
    }

    return {
      result: moveTable.Id
    };
  }

  getAll(orgid: number): Observable<ApiListResponse<MoveTable>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<MoveTable>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllMoveTables`,
      { params }
    );
  }

  async getAllOffline(orgId: number): Promise<MoveTable[]> {
    const sql = `
      SELECT
        Id,
        MoveNo,
        GuestCount,
        StewardId,
        MoveReason,
        OrgId,
        IsActive,
        IsDeleted,
        CreatedBy,
        CreatedDate,
        UpdatedBy,
        UpdatedDate
      FROM MoveTables
      WHERE
        OrgId = ?
        AND IsDeleted = 0
      ORDER BY Id DESC
    `;

    const result = await this.query(sql, [orgId]);
    return result.values ?? [];
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetMoveTableById?id=${id}`);
  }

  async getByIdOffline(id: number): Promise<any> {

    const move = await this.query(
      `
    SELECT *
    FROM MoveTables
    WHERE Id = ?
    LIMIT 1
    `,
      [id]
    );

    if (!move.values?.length) {
      return null;
    }

    const data = move.values[0];

    const details = await this.query(
      `
    SELECT
      FromTable,
      ToTable
    FROM MoveTabledetails
    WHERE MoveNo = ?
      AND IsDeleted = 0
    `,
      [data.MoveNo]
    );

    data.TableDetails = details.values ?? [];

    return data;
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
  }

  async deleteOffline(id: number): Promise<any> {

    const move = await this.getByIdOffline(id);

    if (!move) {
      return null;
    }

    await this.query(
      `
    UPDATE MoveTables
    SET
      IsDeleted = 1,
      UpdatedDate = datetime('now')
    WHERE Id = ?
    `,
      [id]
    );

    await this.query(
      `
    UPDATE MoveTabledetails
    SET IsDeleted = 1
    WHERE MoveNo = ?
    `,
      [move.MoveNo]
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
    UPDATE MoveTables
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