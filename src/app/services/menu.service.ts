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

const ROUTE_ALIASES: Record<string, string[]> = {
  'display-menu-items': ['kitchen-display'],
  'kitchen-display': ['display-menu-items']
};

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

    return this.http.get<MenuResponse>(`${this.baseUrl}/${this.controllerPath}/GetAllMenuAndSubMenu?OrgId=${orgId}&RoleId=${roleId}`).pipe(
      tap((response) => {
        this.menuCache = { orgId, roleId, response };
      })
    );
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

    const routesWithAliases = routes.flatMap((route) => [route, ...(ROUTE_ALIASES[route] ?? [])]);

    return [...new Set(routesWithAliases)];
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}







