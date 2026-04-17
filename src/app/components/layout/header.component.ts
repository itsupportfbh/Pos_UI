import { isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, HostListener, Inject, Input, Output, PLATFORM_ID } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

type HeaderUser = {
  name: string;
  role: string;
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, AvatarModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input({ required: true }) appName = '';
  @Input({ required: true }) user!: HeaderUser;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  isOnline = true;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline = navigator.onLine;
    }
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onLogoutClick(): void {
    this.logoutClick.emit();
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline = false;
  }

  get initials(): string {
    return this.user.name
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get connectionLabel(): string {
    return this.isOnline ? 'Online' : 'Offline';
  }
}
