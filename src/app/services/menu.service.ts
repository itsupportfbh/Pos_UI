import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface ApiSubMenu {
  SubMenuId: number;
  SubMenuName: string;
  EntityNo: number;
  MenuId: number;
  Route: string;
  Remarks?: string;
  IsActive: boolean;
}

export interface ApiMenu {
  MenuId: number;
  MenuName: string;
  MenuIcon?: string;
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

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  getMenus(): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.baseUrl}/${this.controllerPath}/GetAllMenuAndSubMenu`);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}









