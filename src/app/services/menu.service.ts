import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface ApiSubMenu {
  SubMenuId: number;
  SubMenuName: string;
  EntityNo: number;
  MenuId: number;
  Route: string;
  Remarks?: string;
  Menuscope?: number;
  MenuIcon?: string;
  IsActive: boolean;
}

export interface ApiMenu {
  MenuId: number;
  MenuName: string;
  MenuIcon?: string;
  Menuscope?: number;
  IsActive: boolean;
  SubMenus: ApiSubMenu[];
}

export interface MenuResponse {
  result: ApiMenu[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly controllerPath = 'Menu';
  private menuCache: { orgId: number; roleId: number; response: MenuResponse } | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  getMenus(OrgId: number, RoleId: number, forceRefresh: boolean = false): Observable<MenuResponse> {
    const orgId = Number(OrgId || 0);
    const roleId = Number(RoleId || 0);

    if (!forceRefresh && this.menuCache && this.menuCache.orgId === orgId && this.menuCache.roleId === roleId) {
      return of(this.menuCache.response);
    }
    debugger;
    if (navigator.onLine) {
      return this.http.get<MenuResponse>(`${this.baseUrl}/${this.controllerPath}/GetAllMenuAndSubMenu?OrgId=${orgId}&RoleId=${roleId}`).pipe(
        tap((response) => {
          this.menuCache = { orgId, roleId, response };
        })
      );
    }
    else {
      return new Observable<MenuResponse>(observer => {

        this.getMenusOffline(orgId, roleId)
          .then(response => {

            this.menuCache = {
              orgId,
              roleId,
              response
            };

            observer.next(response);
            observer.complete();

          })
          .catch(error => {
            observer.error(error);
          });

      });
    }
  }

  getAccessibleRoutes(OrgId: number, RoleId: number, forceRefresh: boolean = false): Observable<string[]> {
    return this.getMenus(OrgId, RoleId, forceRefresh).pipe(
      map((response) => this.extractRoutes(response.result ?? []))
    );
  }

  clearMenuCache(): void {
    this.menuCache = null;
  }

  private extractRoutes(menus: ApiMenu[]): string[] {
    const routes = menus.flatMap((menu) =>
      (menu.SubMenus ?? []).map((subMenu) => String(subMenu.Route ?? '').trim().toLowerCase()).filter((route) => !!route)
    );

    return [...new Set(routes)];
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }

  async getMenusOffline(orgId: number, roleId: number): Promise<MenuResponse> {

    const menuSql = `
      SELECT
          m.Id AS MenuId,
          m.Name AS MenuName,
          m.IsActive,
          m.Menuscope,
          m.MenuIcon
      FROM Menu m
      WHERE
          m.IsActive = 1
          AND m.IsDeleted = 0
      ORDER BY m.DisplayOrder
  `;

    const menuResult = await this.query(menuSql);

    const menus = [];

    for (const menu of menuResult.values || []) {

      const subMenuSql = `
        SELECT
            sm.Id AS SubMenuId,
            sm.Name AS SubMenuName,
            sm.EntityNo,
            sm.MenuId,
            sm.Route,
            sm.Remarks,
            sm.Menuscope,
            sm.MenuIcon,
            sm.IsActive
        FROM SubMenu sm
        INNER JOIN RolePermission rp
            ON sm.EntityNo = rp.EntityNo
        WHERE
            sm.MenuId = ?
            AND sm.IsActive = 1
            AND sm.IsDeleted = 0
            AND rp.OrgId = ?
            AND rp.RoleId = ?
            AND rp.View = 1
        ORDER BY sm.DisplayOrder
    `;

      const subMenuResult = await this.query(
        subMenuSql,
        [menu.MenuId, orgId, roleId]
      );

      menus.push({
        MenuId: menu.MenuId,
        MenuName: menu.MenuName,
        IsActive: menu.IsActive,
        Menuscope: menu.Menuscope,
        MenuIcon: menu.MenuIcon,
        SubMenus: subMenuResult.values || []
      });
    }

    return {
      result: menus
    };
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return await window.electronAPI.executeQuery(
      sql,
      params
    );
  }
}







