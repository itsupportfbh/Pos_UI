import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {

  private readonly controllerPath = 'Sync';

  constructor(
    private http: HttpClient,
    private runtimeConfig: RuntimeConfigService
  ) { }

  download(payload: any) {
    return this.http.post(
      `${this.baseUrl}/${this.controllerPath}/Download`,
      payload
    );
  }

  upload(payload: any) {
    return this.http.post(
      `${this.baseUrl}/${this.controllerPath}/Upload`,
      payload
    );
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}