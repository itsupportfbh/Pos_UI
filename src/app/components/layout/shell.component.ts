import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';
import { MenuComponent } from './menu.component';
import { MenuChildItem, MenuGroup, MenuOfficeOption } from './menu.model';

type ShellUser = {
  name: string;
  role: string;
  imageUrl?: string;
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
  @Input() currentOfficeScope = 2;
  @Input() officeOptions: MenuOfficeOption[] = [];
  @Input() chromeHidden = false;

  @Output() menuToggle = new EventEmitter<void>();
  @Output() menuSelect = new EventEmitter<MenuChildItem | string>();
  @Output() officeScopeChange = new EventEmitter<number>();
  @Output() changePasswordClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onMenuSelect(item: MenuChildItem | string): void {
    this.menuSelect.emit(item);
  }

  onOfficeScopeChange(scope: number): void {
    this.officeScopeChange.emit(scope);
  }

  onChangePasswordClick(): void {
    this.changePasswordClick.emit();
  }

  onLogoutClick(): void {
    this.logoutClick.emit();
  }
}
