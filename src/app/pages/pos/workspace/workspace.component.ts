import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ShellComponent } from '../../../components/layout/shell.component';
import { POS_MENU_GROUPS } from '../config/menu.config';
import { MenuGroup } from '../../../components/layout/menu.model';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';

@Component({
  selector: 'app-pos-workspace',
  standalone: true,
  imports: [RouterOutlet, ShellComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent {
  private readonly userDetails = this.getUserDetails();
  readonly appName = 'Unity work POS';
  readonly currentUser = {
    name: this.userDetails.UserName ?? 'User',
    role: this.userDetails.RoleName ?? '',
    email: this.userDetails.UserCode ?? '',
    location: this.userDetails.BranchName ?? ''
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
    localStorage.removeItem(LOGIN_SESSION_KEY);
    localStorage.removeItem(USER_DETAILS_KEY);
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

  private getUserDetails(): any {
    try {
      return JSON.parse(localStorage.getItem(USER_DETAILS_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
