import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

type HeaderUser = {
  name: string;
  role: string;
  imageUrl?: string;
};

const THEME_MODE_KEY = 'appTheme';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, AvatarModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnChanges {
  @Input({ required: true }) appName = '';
  @Input() appLogoUrl = '';
  @Input({ required: true }) user!: HeaderUser;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  isOnline = true;
  initials = '';
  connectionLabel = 'Online';
  isDarkMode = false;
  themeButtonLabel = 'Dark';
  themeButtonIcon = 'pi pi-moon';

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline = navigator.onLine;
    }
  }

  ngOnInit(): void {
    this.loadThemeMode();
    this.updateInitials();
    this.updateConnectionLabel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.updateInitials();
    }
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onLogoutClick(): void {
    this.logoutClick.emit();
  }

  onThemeToggle(): void {
    this.isDarkMode = !this.isDarkMode;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_MODE_KEY, this.isDarkMode ? 'dark' : 'light');
    }

    this.applyThemeMode();
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
    this.updateConnectionLabel();
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline = false;
    this.updateConnectionLabel();
  }

  private updateInitials(): void {
    const nameParts = (this.user?.name ?? '').split(' ');
    const firstLetter = nameParts[0]?.[0] ?? '';
    const secondLetter = nameParts[1]?.[0] ?? '';
    this.initials = `${firstLetter}${secondLetter}`.toUpperCase();
  }

  private updateConnectionLabel(): void {
    this.connectionLabel = this.isOnline ? 'Online' : 'Offline';
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
      this.themeButtonLabel = 'Light';
      this.themeButtonIcon = 'pi pi-sun';
      return;
    }

    this.document.documentElement.setAttribute('data-theme', 'light');
    this.themeButtonLabel = 'Dark';
    this.themeButtonIcon = 'pi pi-moon';
  }
}
