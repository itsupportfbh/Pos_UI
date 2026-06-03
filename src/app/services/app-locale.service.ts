import { Injectable } from '@angular/core';
import { AppLanguageService } from './app-language.service';

export interface AppLocaleConfig {
  orgId: number;
  branchId: number;
  languageCode: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  timezone: string;
}

type UserLocaleContext = {
  OrgId?: number | string | null;
  OrganizationId?: number | string | null;
  BranchId?: number | string | null;
  LanguageCode?: string | null;
  BranchLanguageCode?: string | null;
  OrgLanguageCode?: string | null;
  BranchCurrencyCode?: string | null;
  BranchCurrencyName?: string | null;
  BranchCurrencySymbol?: string | null;
  BranchTimezone?: string | null;
  OrgCurrencyCode?: string | null;
  OrgCurrencyName?: string | null;
  OrgCurrencySymbol?: string | null;
  OrgTimezone?: string | null;
};

type NumberFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

@Injectable({
  providedIn: 'root'
})
export class AppLocaleService {
  private readonly storageKey = 'appLocaleConfig';
  private readonly defaultConfig: AppLocaleConfig = {
    orgId: 0,
    branchId: 0,
    languageCode: 'en-SG',
    currencyCode: 'SGD',
    currencyName: 'Singapore Dollar',
    currencySymbol: '$',
    timezone: 'Asia/Singapore'
  };

  constructor(private readonly appLanguage: AppLanguageService) { }

  initialize(): void {
    this.applyLanguage(this.readStoredConfig());
  }

  syncFromUserDetails(userDetails: UserLocaleContext | null | undefined): void {
    const config = this.resolveConfig(userDetails);
    this.persistConfig(config);
    this.applyLanguage(config);
  }

  overrideLanguageCode(languageCode: string | null | undefined): void {
    const currentConfig = this.getConfig();
    const updatedConfig: AppLocaleConfig = {
      ...currentConfig,
      languageCode: this.normalizeString(languageCode, currentConfig.languageCode || this.defaultConfig.languageCode)
    };

    this.persistConfig(updatedConfig);
    this.applyLanguage(updatedConfig);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures and still reset the language state.
    }

    this.applyLanguage(this.defaultConfig);
  }

  getConfig(): AppLocaleConfig {
    return this.readStoredConfig();
  }

  getLanguageCode(): string {
    return this.getConfig().languageCode;
  }

  getCurrencyCode(): string {
    return this.getConfig().currencyCode;
  }

  getCurrencySymbol(): string {
    return this.getConfig().currencySymbol;
  }

  getTimezone(): string {
    return this.getConfig().timezone;
  }

  formatCurrency(value: unknown, options?: NumberFormatOptions & { currencyCode?: string }): string {
    const numericValue = this.toNumericValue(value);
    if (!Number.isFinite(numericValue)) {
      return this.asText(value);
    }

    const config = this.getConfig();
    const currencyCode = String(options?.currencyCode || config.currencyCode || this.defaultConfig.currencyCode).trim();
    const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

    try {
      return new Intl.NumberFormat(config.languageCode, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits,
        maximumFractionDigits
      }).format(numericValue);
    } catch {
      const formattedNumber = this.formatNumber(numericValue, { minimumFractionDigits, maximumFractionDigits });
      return `${config.currencySymbol}${formattedNumber}`;
    }
  }

  formatNumber(value: unknown, options?: NumberFormatOptions): string {
    const numericValue = this.toNumericValue(value);
    if (!Number.isFinite(numericValue)) {
      return this.asText(value);
    }

    const config = this.getConfig();

    return new Intl.NumberFormat(config.languageCode, {
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits
    }).format(numericValue);
  }

  formatDate(value: unknown): string {
    const parsedDate = this.toDate(value);
    if (!parsedDate) {
      return this.asText(value);
    }

    const config = this.getConfig();

    return new Intl.DateTimeFormat(config.languageCode, {
      timeZone: config.timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsedDate);
  }

  formatDateTime(value: unknown): string {
    const parsedDate = this.toDate(value);
    if (!parsedDate) {
      return this.asText(value);
    }

    const config = this.getConfig();

    return new Intl.DateTimeFormat(config.languageCode, {
      timeZone: config.timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsedDate);
  }

  private resolveConfig(userDetails: UserLocaleContext | null | undefined): AppLocaleConfig {
    const branchId = this.toInteger(userDetails?.BranchId);
    const hasBranchContext = branchId > 0;
    const branchLanguageCode = hasBranchContext ? this.readText(userDetails?.BranchLanguageCode) : '';
    const orgLanguageCode = this.readText(userDetails?.OrgLanguageCode);
    const topLevelLanguageCode = this.readText(userDetails?.LanguageCode);
    const branchCurrencyCode = hasBranchContext ? this.readText(userDetails?.BranchCurrencyCode) : '';
    const branchCurrencyName = hasBranchContext ? this.readText(userDetails?.BranchCurrencyName) : '';
    const branchCurrencySymbol = hasBranchContext ? this.readText(userDetails?.BranchCurrencySymbol) : '';
    const branchTimezone = hasBranchContext ? this.readText(userDetails?.BranchTimezone) : '';
    const orgCurrencyCode = this.readText(userDetails?.OrgCurrencyCode);
    const orgCurrencyName = this.readText(userDetails?.OrgCurrencyName);
    const orgCurrencySymbol = this.readText(userDetails?.OrgCurrencySymbol);
    const orgTimezone = this.readText(userDetails?.OrgTimezone);

    return {
      orgId: this.toInteger(userDetails?.OrgId ?? userDetails?.OrganizationId),
      branchId,
      languageCode: this.normalizeString(
        this.firstNonEmpty(branchLanguageCode, orgLanguageCode, topLevelLanguageCode),
        this.defaultConfig.languageCode
      ),
      currencyCode: this.normalizeString(
        this.firstNonEmpty(branchCurrencyCode, orgCurrencyCode),
        this.defaultConfig.currencyCode
      ),
      currencyName: this.normalizeString(
        this.firstNonEmpty(branchCurrencyName, orgCurrencyName),
        this.defaultConfig.currencyName
      ),
      currencySymbol: this.normalizeString(
        this.firstNonEmpty(branchCurrencySymbol, orgCurrencySymbol),
        this.defaultConfig.currencySymbol
      ),
      timezone: this.normalizeString(
        this.firstNonEmpty(branchTimezone, orgTimezone),
        this.defaultConfig.timezone
      )
    };
  }

  private readStoredConfig(): AppLocaleConfig {
    try {
      const storedConfig = localStorage.getItem(this.storageKey);
      if (storedConfig) {
        return this.mergeConfig(JSON.parse(storedConfig) as Partial<AppLocaleConfig>);
      }

      const storedUserDetails = localStorage.getItem('userDetails');
      if (storedUserDetails) {
        return this.resolveConfig(JSON.parse(storedUserDetails) as UserLocaleContext);
      }
    } catch {
      // Ignore parse and storage failures; fall back to defaults below.
    }

    return this.defaultConfig;
  }

  private mergeConfig(config: Partial<AppLocaleConfig>): AppLocaleConfig {
    return {
      orgId: this.toInteger(config.orgId),
      branchId: this.toInteger(config.branchId),
      languageCode: this.normalizeString(config.languageCode, this.defaultConfig.languageCode),
      currencyCode: this.normalizeString(config.currencyCode, this.defaultConfig.currencyCode),
      currencyName: this.normalizeString(config.currencyName, this.defaultConfig.currencyName),
      currencySymbol: this.normalizeString(config.currencySymbol, this.defaultConfig.currencySymbol),
      timezone: this.normalizeString(config.timezone, this.defaultConfig.timezone)
    };
  }

  private persistConfig(config: AppLocaleConfig): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config));
    } catch {
      // Ignore storage failures and still keep the in-memory/apply flow working.
    }
  }

  private applyLanguage(config: AppLocaleConfig): void {
    this.appLanguage.setLanguageCode(config.languageCode);
  }

  private normalizeString(value: unknown, fallback: string): string {
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue || fallback;
  }

  private readText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private firstNonEmpty(...values: string[]): string {
    return values.find((value) => String(value ?? '').trim()) ?? '';
  }

  private toInteger(value: unknown): number {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private toNumericValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : Number.NaN;
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsedDate = new Date(String(value));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private asText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
