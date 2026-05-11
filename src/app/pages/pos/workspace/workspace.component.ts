import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ShellComponent } from '../../../components/layout/shell.component';
import { MenuChildItem, MenuGroup } from '../../../components/layout/menu.model';
import { ApiMenu, MenuService } from '../../../services/menu.service';
import { OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';

@Component({
  selector: 'app-pos-workspace',
  standalone: true,
  imports: [RouterOutlet, ShellComponent, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly userDetails = this.getUserDetails();
  appName = this.userDetails.OrganizationName ?? 'Unity work POS';
  brandLogoUrl = '';
  currentUser = {
    name: this.userDetails.UserName ?? 'User',
    role: this.userDetails.RoleName ?? '',
    imageUrl: '',
    email: this.userDetails.UserCode ?? '',
    location: this.userDetails.BranchName ?? ''
  };
  readonly footerDescription = 'POS workspace for billing, stock tracking, and daily sales operations';
  sidebarMenus: MenuGroup[] = [];

  sidebarOpen = true;
  activeMenuKey = 'dashboard';

  constructor(
    private readonly router: Router,
    private readonly menuService: MenuService,
    private readonly organizationService: OrganizationService,
    private readonly runtimeConfig: RuntimeConfigService,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.syncActiveMenu(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.syncActiveMenu(event.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.currentUser.imageUrl = this.getUserImageUrl(String(this.userDetails.Image ?? this.userDetails.UserImage ?? ''));
    this.loadorganizationconfig();
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
    this.confirmationService.confirm({
      header: 'Logout Confirmation',
      message: 'Are you sure you want to logout?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        localStorage.removeItem(LOGIN_SESSION_KEY);
        localStorage.removeItem(USER_DETAILS_KEY);
        this.router.navigate(['/login']);
      }
    });
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  selectMenu(item: MenuChildItem | string): void {
    if (typeof item === 'string') {
      this.activeMenuKey = item;
      this.router.navigate(['/pos', item]);
      return;
    }

    this.activeMenuKey = item.route;
    sessionStorage.setItem("currentMenuEntityNo", String(item.entityNo || 0));
    this.router.navigate(['/pos', item.route]);
  }

  private syncActiveMenu(url: string): void {
    const routeSegment = url.split('/').filter(Boolean).at(-1);
    this.activeMenuKey = routeSegment && routeSegment !== 'pos' ? routeSegment : 'dashboard';
  }

  async loadorganizationconfig(): Promise<void> {
    const orgId = Number(this.userDetails.OrgId || 0);

    if (!orgId) {
      this.applyOrganizationTheme();
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetOrganizationConfigByOrgId(orgId));
      const config = response?.result;

      if (config) {
        const themeColor = String(config.ThemeColor ?? config.themeColor ?? '#2f7d57');
        const fontSize = Number(config.FontSize ?? config.fontSize ?? 14);
        const image = this.normalizeOrganizationImageValue(String(config.Image ?? config.image ?? ''));

        this.brandLogoUrl = this.getOrganizationLogoUrl(image);
        this.applyOrganizationTheme(themeColor, fontSize);
        this.changeDetector.detectChanges();
        return;
      }
    } catch {
      this.brandLogoUrl = '';
    }

    this.applyOrganizationTheme();
  }

  private mapMenus(menus: ApiMenu[]): MenuGroup[] {
    return menus
      // .filter((menu) => menu.IsActive)
      .map((menu) => ({
        key: String(menu.MenuId),
        label: menu.MenuName,
        icon: menu.MenuIcon ?? 'pi pi-circle',
        items: (menu.SubMenus ?? [])
          // .filter((subMenu) => subMenu.IsActive)
          .map((subMenu) => ({
            key: String(subMenu.SubMenuId),
            label: subMenu.SubMenuName,
            description: subMenu.Remarks ?? '',
            route: subMenu.Route,
            entityNo: Number(subMenu.EntityNo || 0)
          }))
      }));
  }

  private applyOrganizationTheme(themeColor = '#2f7d57', fontSize = 14): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const root = this.document.documentElement;
    const palette = this.buildThemePalette(themeColor);

    root.style.setProperty('--app-font-size', `${fontSize || 14}px`);
    root.style.setProperty('--app-primary', palette.primary);
    root.style.setProperty('--app-primary-rgb', palette.primaryRgb);
    root.style.setProperty('--app-primary-strong', palette.primaryStrong);
    root.style.setProperty('--app-primary-soft', palette.primarySoft);
    root.style.setProperty('--app-accent', palette.accent);
    root.style.setProperty('--app-accent-rgb', palette.accentRgb);
    root.style.setProperty('--app-accent-strong', palette.accentStrong);
    root.style.setProperty('--app-scrollbar', `rgba(${palette.primaryRgb}, 0.3)`);
    root.style.setProperty('--app-scrollbar-hover', `rgba(${palette.primaryRgb}, 0.42)`);
  }

  private buildThemePalette(themeColor: string): any {
    const primary = this.normalizeHexColor(themeColor);
    const primaryStrong = this.adjustHexColor(primary, -32);
    const primarySoft = this.mixHexColor(primary, '#ffffff', 0.88);
    const accent = this.mixHexColor(primary, '#ffffff', 0.38);
    const accentStrong = this.adjustHexColor(accent, -18);

    return {
      primary,
      primaryRgb: this.hexToRgbValue(primary),
      primaryStrong,
      primarySoft,
      accent,
      accentRgb: this.hexToRgbValue(accent),
      accentStrong
    };
  }

  private normalizeHexColor(color: string): string {
    const value = color.trim();

    if (!/^#([A-Fa-f0-9]{6})$/.test(value)) {
      return '#2f7d57';
    }

    return value;
  }

  private adjustHexColor(color: string, amount: number): string {
    const [red, green, blue] = this.hexToRgb(color);

    return this.rgbToHex(
      this.clampColor(red + amount),
      this.clampColor(green + amount),
      this.clampColor(blue + amount)
    );
  }

  private mixHexColor(color: string, mixWith: string, ratio: number): string {
    const [red, green, blue] = this.hexToRgb(color);
    const [mixRed, mixGreen, mixBlue] = this.hexToRgb(mixWith);

    return this.rgbToHex(
      Math.round(red * (1 - ratio) + mixRed * ratio),
      Math.round(green * (1 - ratio) + mixGreen * ratio),
      Math.round(blue * (1 - ratio) + mixBlue * ratio)
    );
  }

  private hexToRgb(color: string): number[] {
    const normalizedColor = this.normalizeHexColor(color).replace('#', '');

    return [
      parseInt(normalizedColor.substring(0, 2), 16),
      parseInt(normalizedColor.substring(2, 4), 16),
      parseInt(normalizedColor.substring(4, 6), 16)
    ];
  }

  private hexToRgbValue(color: string): string {
    return this.hexToRgb(color).join(', ');
  }

  private rgbToHex(red: number, green: number, blue: number): string {
    return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  }

  private clampColor(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  private normalizeOrganizationImageValue(image: string): string {
    const normalizedImage = image.trim();

    if (!normalizedImage) {
      return '';
    }

    if (normalizedImage.includes('/FileUpload/')) {
      return this.normalizeOrganizationImageValue(normalizedImage.split('/FileUpload/').pop() ?? '');
    }

    if (normalizedImage.startsWith('FileUpload/')) {
      return this.normalizeOrganizationImageValue(normalizedImage.substring('FileUpload/'.length));
    }

    if (normalizedImage.startsWith('/')) {
      return this.normalizeOrganizationImageValue(normalizedImage.substring(1));
    }

    if (normalizedImage.startsWith('Organization/Organization/')) {
      return this.normalizeOrganizationImageValue(normalizedImage.substring('Organization/'.length));
    }

    return normalizedImage;
  }

  private getOrganizationLogoUrl(image: string): string {
    const normalizedImage = this.normalizeOrganizationImageValue(image);

    if (!normalizedImage) {
      return '';
    }

    if (/^https?:\/\//i.test(normalizedImage) || normalizedImage.startsWith('data:')) {
      return normalizedImage;
    }

    if (normalizedImage.startsWith('Organization/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    if (normalizedImage.includes('/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${normalizedImage}`;
    }

    return `${this.runtimeConfig.apiBaseUrl}/FileUpload/Organization/${normalizedImage}`;
  }

  private getUserImageUrl(image: string): string {
    const normalizedImage = image.trim();

    if (!normalizedImage) {
      return '';
    }

    if (/^https?:\/\//i.test(normalizedImage) || normalizedImage.startsWith('data:')) {
      return normalizedImage;
    }

    let imagePath = normalizedImage;

    if (imagePath.includes('/FileUpload/')) {
      imagePath = imagePath.split('/FileUpload/').pop() ?? '';
    }

    imagePath = imagePath.replace(/^\/+/, '');

    while (imagePath.startsWith('FileUpload/')) {
      imagePath = imagePath.substring('FileUpload/'.length);
    }

    while (imagePath.startsWith('User/')) {
      imagePath = imagePath.substring('User/'.length);
    }

    if (!imagePath) {
      return '';
    }

    if (imagePath.includes('/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${imagePath}`;
    }

    return `${this.runtimeConfig.apiBaseUrl}/FileUpload/User/${imagePath}`;
  }

  private getUserDetails(): any {
    try {
      return JSON.parse(localStorage.getItem(USER_DETAILS_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
