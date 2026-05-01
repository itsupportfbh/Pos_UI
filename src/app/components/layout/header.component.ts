import { isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
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
export class HeaderComponent implements OnInit, OnChanges {
  @Input({ required: true }) appName = '';
  @Input({ required: true }) user!: HeaderUser;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  isOnline = true;
  initials = '';
  connectionLabel = 'Online';

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline = navigator.onLine;
    }
  }

  ngOnInit(): void {
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
}
