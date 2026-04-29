import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

  GetBranchByUserId(UserId: number | string) {
    return this.http.get(`${this.baseUrl}/${this.controllerPath}/GetBranchByUserId?UserId=${UserId}`);
  }



  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
