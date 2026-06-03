import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { AppLocaleService } from '../../services/app-locale.service';
import { AppTranslationService } from '../../services/app-translation.service';
import { AppTranslatePipe } from '../../pipes/app-translate.pipe';

type HeaderUser = {
  name: string;
  role: string;
  imageUrl?: string;
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
}
