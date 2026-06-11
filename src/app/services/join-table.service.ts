import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface JoinTable {
  Id?: number;
  JoinNo: string;
  PrimaryTable: number;
  TableIds?: Array<{ TableId: number }>;
  GuestCount: number;
  StewardId: number;
  Notes: string;
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
export class JoinTableService {
  private readonly controllerPath = 'JoinTables';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: JoinTable): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  async createOffline(joinTable: JoinTable): Promise<any> {

    const sql = `
    INSERT INTO JoinTables
    (
      JoinNo,
      PrimaryTable,
      GuestCount,
      StewardId,
      Notes,
      OrgId,
      IsActive,
      IsDeleted,
      CreatedBy,
      CreatedDate
    )
    VALUES
    (
      ?,?,?,?,?,?,
      1,0,?,
      datetime('now')
    )
  `;

    const result = await this.query(sql, [
      joinTable.JoinNo,
      joinTable.PrimaryTable,
      joinTable.GuestCount,
      joinTable.StewardId,
      joinTable.Notes,
      joinTable.OrgId,
      joinTable.CreatedBy
    ]);

    const joinTableId =
      result.lastInsertRowid ||
      result.values?.[0]?.Id;

    if (joinTable.TableIds?.length) {

      for (const table of joinTable.TableIds) {

        await this.query(
          `
        INSERT INTO JoinTabledetails
        (
          JoinNo,
          TableId,
          OrgId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?,?,?,0,?,
          datetime('now')
        )
      `,
          [
            joinTable.JoinNo,
            table.TableId,
            joinTable.OrgId,
            joinTable.CreatedBy
          ]
        );
      }
    }

    return result;
  }

  update(payload: JoinTable): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  async updateOffline(joinTable: JoinTable): Promise<any> {

    const sql = `
    UPDATE JoinTables
    SET
      PrimaryTable=?,
      GuestCount=?,
      StewardId=?,
      Notes=?,
      UpdatedBy=?,
      UpdatedDate=datetime('now')
    WHERE Id=?
  `;

    const result = await this.query(sql, [
      joinTable.PrimaryTable,
      joinTable.GuestCount,
      joinTable.StewardId,
      joinTable.Notes,
      joinTable.UpdatedBy,
      joinTable.Id
    ]);

    await this.query(
      `
    DELETE FROM JoinTabledetails
    WHERE JoinNo = ?
  `,
      [joinTable.JoinNo]
    );

    // Insert new mappings
    if (joinTable.TableIds?.length) {

      for (const table of joinTable.TableIds) {

        await this.query(
          `
        INSERT INTO JoinTabledetails
        (
          JoinNo,
          TableId,
          OrgId,
          IsDeleted,
          CreatedBy,
          CreatedDate
        )
        VALUES
        (
          ?,?,?,0,?,
          datetime('now')
        )
      `,
          [
            joinTable.JoinNo,
            table.TableId,
            joinTable.OrgId,
            joinTable.UpdatedBy
          ]
        );
      }
    }

    return result;
  }

  getAll(orgid: number): Observable<ApiListResponse<JoinTable>> {
    const params = new HttpParams().set('orgid', orgid.toString());

    return this.http.get<ApiListResponse<JoinTable>>(
      `${this.baseUrl}/${this.controllerPath}/GetAllJoinTables`,
      { params }
    );
  }

  async getAllOffline(orgId: number): Promise<any[]> {

    const sql = `
    SELECT
      jt.Id,
      jt.JoinNo,
      jt.PrimaryTable,
      dt.Name AS PrimaryTableName,
      jt.GuestCount,
      jt.StewardId,
      em.Name AS StewardName,
      jt.Notes,
      jt.IsActive
    FROM JoinTables jt
    LEFT JOIN DiningTableMaster dt
      ON dt.Id = jt.PrimaryTable
    LEFT JOIN EmployeeMaster em
      ON em.Id = jt.StewardId
    WHERE
      jt.OrgId = ?
      AND jt.IsDeleted = 0
    ORDER BY jt.Id DESC
  `;

    const result = await this.query(sql, [orgId]);

    return result.values ?? [];
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetJoinTableById?id=${id}`);
  }

  async getByIdOffline(id: number): Promise<any> {

    const headerSql = `
    SELECT *
    FROM JoinTables
    WHERE Id = ?
      AND IsDeleted = 0
  `;

    const headerResult =
      await this.query(headerSql, [id]);

    if (!headerResult.values?.length) {
      return null;
    }

    const joinTable =
      headerResult.values[0];

    const detailSql = `
    SELECT
      TableId
    FROM JoinTabledetails
    WHERE
      JoinNo = ?
      AND IsDeleted = 0
  `;

    const detailResult =
      await this.query(
        detailSql,
        [joinTable.JoinNo]
      );

    joinTable.TableIds =
      detailResult.values ?? [];

    return joinTable;
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/DeleteById?id=${id}`);
  }

  async deleteOffline(id: number): Promise<any> {

    const joinTable =
      await this.getByIdOffline(id);

    if (!joinTable) {
      return null;
    }

    await this.query(
      `
    UPDATE JoinTables
    SET
      IsDeleted = 1,
      UpdatedDate = datetime('now')
    WHERE Id = ?
  `,
      [id]
    );

    await this.query(
      `
    UPDATE JoinTabledetails
    SET IsDeleted = 1
    WHERE JoinNo = ?
  `,
      [joinTable.JoinNo]
    );

    return true;
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return await window.electronAPI.executeQuery(sql, params);
  }
}  