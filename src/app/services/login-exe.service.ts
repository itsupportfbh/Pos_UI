import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface LoginexeRequest {
  Pin: number;
}

export interface LoginResponse {
  Token?: string;
  Role?: string;
  Name?: string;
  Location?: string;
  IsSuccess?: boolean;
  token?: string;
  role?: string;
  name?: string;
  location?: string;
  message?: string;
  isSuccess?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly controllerPath = 'Auth';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  login(payload: LoginexeRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/${this.controllerPath}/Loginwithpin`, payload);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async loginOffline(pin: number): Promise<any> {

    const sql = `
      SELECT
          um.IsAdmin,
          um.Id AS UserId,
          um.Code AS UserCode,
          um.EmpCode,
          um.Name AS UserName,
          rm.Id AS RoleId,
          rm.Name AS RoleName,
          um.OrgId,
          um.Image,
          org.Code AS OrgCode,
          org.Name AS OrgName,
          ubm.BranchId,
          br.Name AS BranchName
      FROM UserMaster um
      INNER JOIN UserRoleMapping urm
          ON um.Id = urm.UserId
      INNER JOIN RoleMaster rm
          ON urm.RoleId = rm.Id
      INNER JOIN Organization org
          ON um.OrgId = org.Id
      LEFT JOIN UserBranchMapping ubm
          ON um.Id = ubm.UserId
      LEFT JOIN Branch br
          ON ubm.BranchId = br.Id
      WHERE
          um.PinNo = ?
          AND um.IsActive = 1
          AND um.IsDeleted = 0
      LIMIT 1
    `;
debugger;
    const result = await this.query(sql, [pin]);
    console.log(result);
    if (!result?.values?.length) {
      return {
        result: {
          Status: false,
          Message: 'Invalid PIN'
        },
        ErrorInfo: {
          Message: false
        }
      };
    }

    const user = result.values[0];

    return {
      result: {
        Status: true,
        Token: 'OFFLINE_' + Date.now(),
        Expiration: new Date(
          Date.now() + 86400000
        ).toISOString(),

        UserDetails: [
          {
            IsAdmin: !!user.IsAdmin,
            UserId: user.UserId,
            UserCode: user.UserCode,
            EmpCode: user.EmpCode,
            UserName: user.UserName,
            RoleId: user.RoleId,
            RoleName: user.RoleName,
            OrgId: user.OrgId,
            OrgCode: user.OrgCode,
            OrgName: user.OrgName,
            BranchId: user.BranchId,
            BranchName: user.BranchName,
            Image: user.Image || ''
          }
        ]
      },
      ErrorInfo: {
        Message: true
      }
    };
  }

  async query(sql: string, params: any[] = []): Promise<any> {

    return await window.electronAPI.executeQuery(
      sql,
      params
    );
  }
} 