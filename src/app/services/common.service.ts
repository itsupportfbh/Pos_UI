import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  private readonly controllerPath = 'Common';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }



  GetCountry() {
    return this.http.get(`${this.baseUrl}/${this.controllerPath}/GetCountry`);
  }

  GetStateByCountryId(CountryId: number | string) {
    return this.http.get(`${this.baseUrl}/${this.controllerPath}/GetStateByCountryId?CountryId=${CountryId}`);
  }

GetCityByStateId(StateId: number | string) {
    return this.http.get(`${this.baseUrl}/${this.controllerPath}/GetCityByStateId?StateId=${StateId}`);
  }



  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
