import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppLocaleService } from '../../services/app-locale.service';
import { AppTranslationService } from '../../services/app-translation.service';
import { AppTranslatePipe } from '../../pipes/app-translate.pipe';
import { CommonService } from '../../services/common.service';
import { AppLocaleService } from '../../services/app-locale.service';
import { AppTranslationService } from '../../services/app-translation.service';
import { AppTranslatePipe } from '../../pipes/app-translate.pipe';

type HeaderUser = {
  name: string;
  role: string;
  imageUrl?: string;
};

type HeaderBranchOption = {
  label: string;
  value: number;
  branch: any;
};

const THEME_MODE_KEY = 'appTheme';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, AvatarModule, FormsModule, AppTranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnChanges {
  @Input({ required: true }) appName = '';
  @Input() appLogoUrl = '';
  @Input({ required: true }) user!: HeaderUser;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() changePasswordClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  isOnline = true;
  initials = '';
  isDarkMode = false;
  themeButtonIcon = 'pi pi-moon';
  showProfileCard = false;
  selectedLanguageCode = 'en-IN';
  selectedBranchValue: number | string | null = null;
  isLanguageChanging = false;
  isBranchLoading = false;
  isBranchChanging = false;
  branchOptions: HeaderBranchOption[] = [];
  isLanguageChanging = false;
  readonly languageOptions = [
    { label: 'English (India)', value: 'en-IN' },
    { label: 'English (Singapore)', value: 'en-SG' },
    { label: 'Tamil (India)', value: 'ta-IN' },
    { label: 'Hindi (India)', value: 'hi-IN' },
    { label: 'Telugu (India)', value: 'te-IN' },
    { label: 'Kannada (India)', value: 'kn-IN' },
    { label: 'Malayalam (India)', value: 'ml-IN' },
    { label: 'Marathi (India)', value: 'mr-IN' },
    { label: 'Gujarati (India)', value: 'gu-IN' },
    { label: 'Bengali (India)', value: 'bn-IN' },
    { label: 'Punjabi (India)', value: 'pa-IN' },
    { label: 'Odia (India)', value: 'or-IN' },
    { label: 'Urdu (India)', value: 'ur-IN' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Chinese (Simplified)', value: 'zh-CN' },
    { label: 'Chinese (Traditional)', value: 'zh-TW' },
    { label: 'Japanese', value: 'ja-JP' },
    { label: 'Korean', value: 'ko-KR' },
    { label: 'Thai', value: 'th-TH' },
    { label: 'Vietnamese', value: 'vi-VN' },
    { label: 'Indonesian', value: 'id-ID' },
    { label: 'Malay', value: 'ms-MY' },
    { label: 'French', value: 'fr-FR' },
    { label: 'German', value: 'de-DE' },
    { label: 'Spanish', value: 'es-ES' },
    { label: 'Portuguese', value: 'pt-PT' },
    { label: 'Italian', value: 'it-IT' },
    { label: 'Russian', value: 'ru-RU' }
  ];

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly appLocale: AppLocaleService,
    private readonly appTranslation: AppTranslationService,
    private readonly commonService: CommonService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline = navigator.onLine;
    }
  }

  ngOnInit(): void {
    this.loadThemeMode();
    this.selectedLanguageCode = this.appLocale.getLanguageCode();
    this.updateInitials();
    void this.loadBranches();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.selectedLanguageCode = this.appLocale.getLanguageCode();
      this.updateInitials();
    }
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onLogoutClick(): void {
    this.showProfileCard = false;
    this.logoutClick.emit();
  }

  onProfileToggle(event?: Event): void {
    event?.stopPropagation();
    this.showProfileCard = !this.showProfileCard;
  }

  onChangePasswordClick(): void {
    this.showProfileCard = false;
    this.changePasswordClick.emit();
  }

  onThemeToggle(): void {
    this.isDarkMode = !this.isDarkMode;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_MODE_KEY, this.isDarkMode ? 'dark' : 'light');
    }

    this.applyThemeMode();
  }

  async onLanguageChange(languageCode: string): Promise<void> {
    if (!languageCode || languageCode === this.selectedLanguageCode || this.isLanguageChanging) {
      return;
    }

    const previousLanguageCode = this.selectedLanguageCode;
    this.isLanguageChanging = true;
    this.selectedLanguageCode = languageCode;
    this.changeDetector.detectChanges();

    try {
      this.appLocale.overrideLanguageCode(languageCode);
      this.updateStoredUserLanguage(languageCode);
      await this.appTranslation.reload(languageCode);
    } catch {
      this.selectedLanguageCode = previousLanguageCode;
      this.appLocale.overrideLanguageCode(previousLanguageCode);
      this.updateStoredUserLanguage(previousLanguageCode);
    } finally {
      this.isLanguageChanging = false;
      this.changeDetector.detectChanges();
    }
  }

  async onBranchChange(branchId: number | string): Promise<void> {
    if (!branchId || this.isBranchChanging || this.isBranchLoading) {
      return;
    }

    const numericBranchId = Number(branchId || 0);
    const userDetails = this.getStoredUserDetails();
    const currentBranchId = Number(
      userDetails?.BranchId
      ?? userDetails?.branchId
      ?? 0
    );

    if (!numericBranchId || numericBranchId === currentBranchId) {
      return;
    }

    const previousBranchValue = this.selectedBranchValue;
    this.isBranchChanging = true;
    this.selectedBranchValue = numericBranchId;
    this.changeDetector.detectChanges();

    try {
      const selectedBranchOption = this.branchOptions.find((item) => Number(item.value || 0) === numericBranchId);
      const branch = selectedBranchOption?.branch ?? null;

      if (!selectedBranchOption || !branch) {
        throw new Error('Branch details not found.');
      }

      const updatedUserDetails = {
        ...userDetails,
        BranchId: numericBranchId,
        BranchName: String(branch?.Name ?? branch?.name ?? selectedBranchOption?.label ?? '').trim(),
        BranchLanguageCode: String(branch?.LanguageCode ?? branch?.languageCode ?? '').trim(),
        BranchCountry: Number(branch?.Country ?? branch?.country ?? 0),
        BranchState: Number(branch?.State ?? branch?.state ?? 0),
        BranchCity: Number(branch?.City ?? branch?.city ?? 0)
      };

      updatedUserDetails.LanguageCode = this.firstNonEmpty(
        updatedUserDetails.BranchLanguageCode,
        updatedUserDetails.OrgLanguageCode,
        updatedUserDetails.LanguageCode
      );

      await this.refreshUserLocaleContext(updatedUserDetails);

      localStorage.setItem('userDetails', JSON.stringify(updatedUserDetails));
      this.appLocale.syncFromUserDetails(updatedUserDetails);
      await this.appTranslation.reload(updatedUserDetails.LanguageCode);
      window.location.reload();
    } catch {
      this.selectedBranchValue = previousBranchValue;
      this.changeDetector.detectChanges();
    } finally {
      this.isBranchChanging = false;
      this.changeDetector.detectChanges();
    }
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showProfileCard = false;
  }

  private updateInitials(): void {
    const nameParts = (this.user?.name ?? '').split(' ');
    const firstLetter = nameParts[0]?.[0] ?? '';
    const secondLetter = nameParts[1]?.[0] ?? '';
    this.initials = `${firstLetter}${secondLetter}`.toUpperCase();
  }

  private async loadBranches(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const userDetails = this.getStoredUserDetails();
    const userId = Number(
      userDetails?.UserId
      ?? userDetails?.userId
      ?? userDetails?.Id
      ?? userDetails?.id
      ?? 0
    );

    if (!userId) {
      this.branchOptions = [];
      this.selectedBranchValue = null;
      return;
    }

    this.isBranchLoading = true;
    this.changeDetector.detectChanges();

    try {
      const response: any = await firstValueFrom(this.commonService.GetBranchByUserId(userId));
      const rows = Array.isArray(response?.result)
        ? response.result
        : Array.isArray(response?.Result)
          ? response.Result
          : Array.isArray(response)
            ? response
            : [];

      this.branchOptions = rows.map((item: any) => ({
        label: String(item?.Name ?? '').trim(),
        value: Number(item?.Id ?? 0),
        branch: item
      })).filter((item: HeaderBranchOption) => String(item.label).trim());

      const currentBranchName = String(
        userDetails?.BranchName
        ?? userDetails?.branchName
        ?? ''
      ).trim();

      const selectedBranch = this.branchOptions.find((item) => item.label === currentBranchName);
      this.selectedBranchValue = selectedBranch?.value ?? this.branchOptions[0]?.value ?? null;
    } catch {
      this.branchOptions = [];
      this.selectedBranchValue = null;
    } finally {
      this.isBranchLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  private loadThemeMode(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedTheme = localStorage.getItem(THEME_MODE_KEY) ?? 'light';
    this.isDarkMode = savedTheme === 'dark';
    this.applyThemeMode();
  }

  private applyThemeMode(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.isDarkMode) {
      this.document.documentElement.setAttribute('data-theme', 'dark');
      this.themeButtonIcon = 'pi pi-sun';
      return;
    }

    this.document.documentElement.setAttribute('data-theme', 'light');
    this.themeButtonIcon = 'pi pi-moon';
  }

  private updateStoredUserLanguage(languageCode: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const rawUserDetails = localStorage.getItem('userDetails');
      if (!rawUserDetails) {
        return;
      }

      const userDetails = JSON.parse(rawUserDetails);
      userDetails.LanguageCode = languageCode;
      localStorage.setItem('userDetails', JSON.stringify(userDetails));
    } catch {
      // Ignore session update failures and keep the active app language in memory.
    }
  }

  private async refreshUserLocaleContext(userDetails: any): Promise<void> {
    try {
      const countriesResponse: any = await firstValueFrom(this.commonService.GetCountry());
      const countries = countriesResponse?.result ?? countriesResponse?.Result ?? countriesResponse ?? [];

      const orgCountry = countries.find((country: any) => Number(country.Id || 0) === Number(userDetails.OrgCountry || 0));
      const branchCountry = countries.find((country: any) => Number(country.Id || 0) === Number(userDetails.BranchCountry || 0));

      if (orgCountry) {
        userDetails.OrgCurrencyCode = orgCountry.Currency ?? userDetails.OrgCurrencyCode ?? '';
        userDetails.OrgCurrencyName = orgCountry.CurrencyName ?? userDetails.OrgCurrencyName ?? '';
        userDetails.OrgCurrencySymbol = orgCountry.CurrencySymbol ?? userDetails.OrgCurrencySymbol ?? '';
      }

      if (branchCountry) {
        userDetails.BranchCurrencyCode = branchCountry.Currency ?? userDetails.BranchCurrencyCode ?? '';
        userDetails.BranchCurrencyName = branchCountry.CurrencyName ?? userDetails.BranchCurrencyName ?? '';
        userDetails.BranchCurrencySymbol = branchCountry.CurrencySymbol ?? userDetails.BranchCurrencySymbol ?? '';
      } else if (Number(userDetails.BranchId || 0) <= 0) {
        userDetails.BranchCurrencyCode = '';
        userDetails.BranchCurrencyName = '';
        userDetails.BranchCurrencySymbol = '';
      }

      userDetails.OrgTimezone = await this.resolveTimezone(
        Number(userDetails.OrgCountry || 0),
        Number(userDetails.OrgState || 0),
        Number(userDetails.OrgCity || 0),
        userDetails.OrgTimezone
      );

      userDetails.BranchTimezone = await this.resolveTimezone(
        Number(userDetails.BranchCountry || 0),
        Number(userDetails.BranchState || 0),
        Number(userDetails.BranchCity || 0),
        userDetails.BranchTimezone
      );

      if (Number(userDetails.BranchId || 0) <= 0) {
        userDetails.BranchLanguageCode = '';
        userDetails.BranchTimezone = '';
      }
    } catch {
      // Ignore locale refresh failures and keep the branch switch usable.
    }
  }

  private async resolveTimezone(
    countryId: number,
    stateId: number,
    cityId: number,
    fallbackTimezone: string
  ): Promise<string> {
    try {
      if (stateId > 0) {
        const citiesResponse: any = await firstValueFrom(this.commonService.GetCityByStateId(stateId));
        const cities = citiesResponse?.result ?? citiesResponse?.Result ?? citiesResponse ?? [];
        const selectedCity = cities.find((city: any) => Number(city.Id || 0) === cityId);
        if (selectedCity?.Timezone) {
          return String(selectedCity.Timezone).trim();
        }
      }

      if (countryId > 0) {
        const statesResponse: any = await firstValueFrom(this.commonService.GetStateByCountryId(countryId));
        const states = statesResponse?.result ?? statesResponse?.Result ?? statesResponse ?? [];
        const selectedState = states.find((state: any) => Number(state.Id || 0) === stateId);
        if (selectedState?.Timezone) {
          return String(selectedState.Timezone).trim();
        }
      }
    } catch {
      // Fall back below.
    }

    return String(fallbackTimezone ?? '').trim();
  }

  private firstNonEmpty(...values: Array<string | null | undefined>): string {
    return values.find((value) => String(value ?? '').trim())?.trim() ?? '';
  }

  private getStoredUserDetails(): any {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    } catch {
      return null;
    }
  }
}
