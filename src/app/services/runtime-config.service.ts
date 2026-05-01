import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

type AppConfig = {
  apiBaseUrl: string;
};

@Injectable({
  providedIn: 'root'
})
export class RuntimeConfigService {
  apiBaseUrl = 'https://localhost:5001';

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<AppConfig>('app-config.json'));
      this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    } catch {
      this.apiBaseUrl = this.apiBaseUrl.replace(/\/+$/, '');
    }
  }
}









