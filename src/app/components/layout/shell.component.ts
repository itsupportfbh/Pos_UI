import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';
import { MenuComponent } from './menu.component';
import { MenuGroup } from './menu.model';

type ShellUser = {
  name: string;
  role: string;
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, HeaderComponent, MenuComponent, FooterComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  @Input({ required: true }) appName = '';
  @Input() appLogoUrl = '';
  @Input({ required: true }) user!: ShellUser;
  @Input() footerDescription = '';
  @Input() sidebarOpen = false;
  @Input() activeMenuKey = '';
  @Input() menuItems: MenuGroup[] = [];

  @Output() menuToggle = new EventEmitter<void>();
  @Output() menuSelect = new EventEmitter<string>();
  @Output() logoutClick = new EventEmitter<void>();

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onMenuSelect(menuKey: string): void {
    this.menuSelect.emit(menuKey);
  }

  onLogoutClick(): void {
    this.logoutClick.emit();
  }
}
