import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ShellComponent } from '../../../components/layout/shell.component';
import { MenuGroup } from '../../../components/layout/menu.model';
import { ApiMenu, MenuService } from '../../../services/menu.service';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';

@Component({
  selector: 'app-pos-workspace',
  standalone: true,
  imports: [RouterOutlet, ShellComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly userDetails = this.getUserDetails();
  readonly appName = 'Unity work POS';
  readonly currentUser = {
    name: this.userDetails.UserName ?? 'User',
    role: this.userDetails.RoleName ?? '',
    email: this.userDetails.UserCode ?? '',
    location: this.userDetails.BranchName ?? ''
  };
  readonly footerDescription = 'POS workspace for billing, stock tracking, and daily sales operations';
  sidebarMenus: MenuGroup[] = [];

  sidebarOpen = true;
  activeMenuKey = 'dashboard';

  constructor(
    private readonly router: Router,
    private readonly menuService: MenuService
  ) {
    this.syncActiveMenu(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.syncActiveMenu(event.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.menuService.getMenus().subscribe({
      next: (response) => {
        this.sidebarMenus = this.mapMenus(response.result ?? []);
         this.changeDetector.detectChanges();
      },
      error: () => {
        this.sidebarMenus = [];
      }
    });
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

  private mapMenus(menus: ApiMenu[]): MenuGroup[] {
    return menus
      // .filter((menu) => menu.IsActive)
      .map((menu) => ({
        key: String(menu.MenuId),
        label: menu.MenuName,
        icon: this.getMenuIcon(menu.MenuName),
        items: (menu.SubMenus ?? [])
          // .filter((subMenu) => subMenu.IsActive)
          .map((subMenu) => ({
            key: String(subMenu.SubMenuId),
            label: subMenu.SubMenuName,
            description: subMenu.Remarks ?? '',
            route: subMenu.Route
          }))
      }));
  }

  private getMenuIcon(menuName: string): string {
    if (menuName === 'Dashboard') return 'pi pi-home';
    if (menuName === 'Organization') return 'pi pi-building';
    if (menuName === 'Users & Roles') return 'pi pi-users';
    if (menuName === 'Food Menu') return 'pi pi-box';
    if (menuName === 'Customers') return 'pi pi-id-card';
    if (menuName === 'Billing') return 'pi pi-shopping-cart';
    if (menuName === 'Orders') return 'pi pi-receipt';
    if (menuName === 'Reports') return 'pi pi-chart-line';
    if (menuName === 'Inventory') return 'pi pi-warehouse';
    if (menuName === 'Payments') return 'pi pi-credit-card';

    return 'pi pi-circle';
  }

  private getUserDetails(): any {
    try {
      return JSON.parse(localStorage.getItem(USER_DETAILS_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
