import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

type UserLanguageContext = {
  LanguageCode?: string | null;
  BranchLanguageCode?: string | null;
  OrgLanguageCode?: string | null;
};

@Injectable({
  providedIn: 'root'
})
export class AppLanguageService {
  private readonly storageKey = 'appLanguageCode';
  private readonly defaultLanguageCode = 'en-SG';

  constructor(@Inject(DOCUMENT) private readonly document: Document) { }

  initialize(): void {
    this.applyDocumentLanguage(this.readStoredLanguageCode());
  }

  syncFromUserDetails(userDetails: UserLanguageContext | null | undefined): void {
    this.setLanguageCode(this.resolveLanguageCode(userDetails));
  }

  setLanguageCode(languageCode: string | null | undefined): void {
    const resolvedLanguageCode = this.normalizeLanguageCode(languageCode);

    try {
      localStorage.setItem(this.storageKey, resolvedLanguageCode);
    } catch {
      // Ignore storage failures and still apply the language to the document.
    }

    this.applyDocumentLanguage(resolvedLanguageCode);
  }

  getLanguageCode(): string {
    return this.readStoredLanguageCode();
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures and reset the document language only.
    }

    this.applyDocumentLanguage(this.defaultLanguageCode);
  }

  private resolveLanguageCode(userDetails: UserLanguageContext | null | undefined): string {
    return this.normalizeLanguageCode(
      this.firstNonEmpty(
        userDetails?.BranchLanguageCode,
        userDetails?.OrgLanguageCode,
        userDetails?.LanguageCode
      )
    );
  }

  private readStoredLanguageCode(): string {
    try {
      const storedLanguageCode = localStorage.getItem(this.storageKey);
      if (String(storedLanguageCode ?? '').trim()) {
        return this.normalizeLanguageCode(storedLanguageCode);
      }

      const storedUserDetails = localStorage.getItem('userDetails');
      if (storedUserDetails) {
        const parsedUserDetails = JSON.parse(storedUserDetails) as UserLanguageContext;
        return this.resolveLanguageCode(parsedUserDetails);
      }

      return this.defaultLanguageCode;
    } catch {
      return this.defaultLanguageCode;
    }
  }

  private normalizeLanguageCode(languageCode: string | null | undefined): string {
    const trimmedLanguageCode = String(languageCode ?? '').trim();
    return trimmedLanguageCode || this.defaultLanguageCode;
  }

  private firstNonEmpty(...values: Array<string | null | undefined>): string {
    return values.find((value) => String(value ?? '').trim())?.trim() ?? '';
  }

  private applyDocumentLanguage(languageCode: string): void {
    this.document.documentElement.lang = languageCode;
  }
}
