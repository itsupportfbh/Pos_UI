import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ShellComponent } from '../../../components/layout/shell.component';
import { POS_MENU_GROUPS } from '../config/menu.config';
import { MenuGroup } from '../config/models';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_ROLE_KEY = 'userRole';
const AUTH_NAME_KEY = 'userName';
const AUTH_LOCATION_KEY = 'userLocation';

@Component({
  selector: 'app-pos-workspace',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ShellComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent {
  readonly appName = 'Antony POS';
  readonly currentUser = {
    name: localStorage.getItem(AUTH_NAME_KEY) ?? 'Antony Admin',
    role: localStorage.getItem(AUTH_ROLE_KEY) ?? 'Admin',
    email: localStorage.getItem(AUTH_ROLE_KEY) === 'Staff' ? 'staff@antonypos.com' : 'admin@antonypos.com',
    location: localStorage.getItem(AUTH_LOCATION_KEY) ?? 'Head Office'
  };
  readonly footerDescription = 'POS workspace for billing, stock tracking, and daily sales operations';
  readonly sidebarMenus: MenuGroup[] = POS_MENU_GROUPS;

  sidebarOpen = false;
  activeMenuKey = 'dashboard';

  constructor(private readonly router: Router) {
    this.syncActiveMenu(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.syncActiveMenu(event.urlAfterRedirects));
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(AUTH_NAME_KEY);
    localStorage.removeItem(AUTH_LOCATION_KEY);
    this.router.navigate(['/login']);
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  selectMenu(menuKey: string): void {
    this.activeMenuKey = menuKey;
    this.router.navigate(['/pos', menuKey]);
  }

  private syncActiveMenu(url: string): void {
    const routeSegment = url.split('/').filter(Boolean).at(-1);
    this.activeMenuKey = routeSegment && routeSegment !== 'pos' ? routeSegment : 'dashboard';
  }
}
