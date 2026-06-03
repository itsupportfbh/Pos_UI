import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppLocaleService } from './app-locale.service';
import { RuntimeConfigService } from './runtime-config.service';

type TranslationEntry = {
  Key: string;
  Value: string;
};

type TranslationApiResponse = {
  result: TranslationEntry[];
};

@Injectable({
  providedIn: 'root'
})
export class AppTranslationService {
  private readonly storageKey = 'appTranslations';
  private readonly fallbackLanguageCode = 'en-IN';
  private translations: Record<string, string> = {};
  private activeLanguageCode = '';

  constructor(
    private readonly http: HttpClient,
    private readonly ngZone: NgZone,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly appLocale: AppLocaleService
  ) { }

  async initialize(): Promise<void> {
    this.restoreFromStorage();
    await this.reload();
  }

  async reload(languageCode?: string): Promise<void> {
    const requestedLanguageCode = String(languageCode || this.appLocale.getLanguageCode() || this.fallbackLanguageCode).trim();

    try {
      const response = await firstValueFrom(
        this.http.get<TranslationApiResponse>(
          `${this.baseUrl}/Translation/GetTranslations?LanguageCode=${encodeURIComponent(requestedLanguageCode)}&FallbackLanguageCode=${encodeURIComponent(this.fallbackLanguageCode)}`
        )
      );

      const entries = response.result ?? [];
      this.translations = entries.reduce<Record<string, string>>((accumulator, entry) => {
        if (entry?.Key) {
          accumulator[entry.Key] = entry.Value ?? '';
        }
        return accumulator;
      }, {});
      this.activeLanguageCode = requestedLanguageCode;
      this.persistToStorage();
    } catch {
      this.ngZone.run(() => {
        if (!Object.keys(this.translations).length) {
          this.translations = {};
          this.activeLanguageCode = requestedLanguageCode;
        }
      });
      return;
    }

    this.ngZone.run(() => {
      this.translations = { ...this.translations };
      this.activeLanguageCode = requestedLanguageCode;
    });
  }

  t(key: string, fallbackText = ''): string {
    return this.translations[key] || fallbackText || key;
  }

  clear(): void {
    this.translations = {};
    this.activeLanguageCode = '';

    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  private restoreFromStorage(): void {
    try {
      const storedValue = localStorage.getItem(this.storageKey);
      if (!storedValue) {
        return;
      }

      const parsedValue = JSON.parse(storedValue) as {
        activeLanguageCode?: string;
        translations?: Record<string, string>;
      };

      this.activeLanguageCode = String(parsedValue.activeLanguageCode || '').trim();
      this.translations = parsedValue.translations ?? {};
    } catch {
      this.translations = {};
      this.activeLanguageCode = '';
    }
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        activeLanguageCode: this.activeLanguageCode,
        translations: this.translations
      }));
    } catch {
      // Ignore storage write failures.
    }
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}
