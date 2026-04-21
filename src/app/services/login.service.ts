import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface LoginRequest {
  Email: string;
  Password: string;
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

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/${this.controllerPath}/Login`, payload);
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
