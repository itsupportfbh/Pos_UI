import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { ShellComponent } from '../../../components/layout/shell.component';
import { MenuChildItem, MenuGroup, MenuOfficeOption } from '../../../components/layout/menu.model';
import { AppTranslatePipe } from '../../../pipes/app-translate.pipe';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { AppTranslationService } from '../../../services/app-translation.service';
import { ApiMenu, MenuService } from '../../../services/menu.service';
import { OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';
const COMMON_MENU_SCOPE = 0;
const FRONT_OFFICE_SCOPE = 1;
const BACK_OFFICE_SCOPE = 2;

@Component({
  selector: 'app-pos-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, ShellComponent, ConfirmDialogModule, ButtonModule, DialogModule, InputTextModule, PasswordModule, TextFieldComponent, ActionButtonsComponent, AppTranslatePipe],
  providers: [ConfirmationService],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly toast = inject(AppToastService);
  private readonly userDetails = this.getUserDetails();
  private readonly routeScopeMap = new Map<string, number>();
  appName = this.userDetails.OrganizationName ?? 'Unity work POS';
  brandLogoUrl = '';
  currentUser = {
    name: this.userDetails.UserName ?? 'User',
    role: this.userDetails.RoleName ?? '',
    imageUrl: '',
    email: this.userDetails.UserCode ?? '',
    location: this.userDetails.BranchName ?? ''
  };
  sidebarMenus: MenuGroup[] = [];
  officeOptions: MenuOfficeOption[] = [];
  currentOfficeScope = BACK_OFFICE_SCOPE;
  showChangePasswordDialog = false;
  changePasswordSubmitted = false;
  changePasswordCurrent = '';
  changePasswordNew = '';
  changePasswordConfirm = '';

  get showNewPasswordRuleError(): boolean {
    return this.changePasswordSubmitted && !!this.changePasswordNew.trim() && !this.isPasswordValid(this.changePasswordNew);
  }

  get showConfirmPasswordMismatch(): boolean {
    return this.changePasswordSubmitted &&
      !!this.changePasswordConfirm.trim() &&
      !!this.changePasswordNew.trim() &&
      this.changePasswordNew !== this.changePasswordConfirm;
  }

  get footerDescription(): string {
    return this.t('footer.description', 'POS workspace for billing, stock tracking, and daily sales operations');
  }

  get passwordRuleMessage(): string {
    return this.t('workspace.password_rule_message', 'Password must be at least 6 characters and include uppercase, lowercase, number, and one special character (@ # $ % & *).');
  }

  sidebarOpen = true;
  activeMenuKey = 'dashboard';

  get isDisplayChromeHidden(): boolean {
    return false;
  }

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
    const orgId = Number(this.userDetails.OrganizationId ?? this.userDetails.OrgId ?? 0);
    const roleId = Number(this.userDetails.RoleId ?? 0);

    this.menuService.getMenus(orgId, roleId, true).subscribe({
      next: (response) => {
        this.sidebarMenus = this.mapMenus(response.result ?? []);
        this.routeScopeMap.clear();
        this.sidebarMenus.forEach((group) => {
          group.items.forEach((item) => {
            if (!this.routeScopeMap.has(item.route)) {
              this.routeScopeMap.set(item.route, Number(group.sectionScope ?? COMMON_MENU_SCOPE));
            }
          });
        });

        this.officeOptions = this.buildOfficeOptions(this.sidebarMenus);
        this.currentOfficeScope = this.resolveInitialOfficeScope();
        this.applyOfficeScope(this.activeMenuKey);
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.sidebarMenus = [];
        this.routeScopeMap.clear();
        this.officeOptions = [];
        this.currentOfficeScope = this.resolveInitialOfficeScope();
        this.applyOfficeScope(this.activeMenuKey);
      }
    });
  }

  logout(): void {
    this.confirmationService.confirm({
      header: this.t('workspace.logout_confirm_title', 'Logout Confirmation'),
      message: this.t('workspace.logout_confirm_message', 'Are you sure you want to logout?'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t('common.yes', 'Yes'),
      rejectLabel: this.t('common.no', 'No'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.menuService.clearMenuCache();
        localStorage.removeItem(LOGIN_SESSION_KEY);
        localStorage.removeItem(USER_DETAILS_KEY);
        localStorage.removeItem('shiftAssignment');
        this.router.navigate(['/login']);
      }
    });
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  onOfficeScopeChange(scope: number): void {
    this.currentOfficeScope = scope;
    this.applyOfficeScope(this.activeMenuKey);
  }

  openChangePasswordDialog(): void {
    this.changePasswordSubmitted = false;
    this.changePasswordCurrent = '';
    this.changePasswordNew = '';
    this.changePasswordConfirm = '';
    this.showChangePasswordDialog = true;
  }

  closeChangePasswordDialog(): void {
    this.showChangePasswordDialog = false;
  }

  clearChangePasswordForm(): void {
    this.changePasswordSubmitted = false;
    this.changePasswordCurrent = '';
    this.changePasswordNew = '';
    this.changePasswordConfirm = '';
  }

  submitChangePassword(): void {
    this.changePasswordSubmitted = true;

    if (!this.changePasswordCurrent || !this.changePasswordNew || !this.changePasswordConfirm) {
      this.toast.warn(
        this.t('workspace.password_required_title', 'Password Required'),
        this.t('workspace.password_required_message', 'Enter the current password and confirm the new password.')
      );
      return;
    }

    if (!this.isPasswordValid(this.changePasswordNew)) {
      this.toast.warn(this.t('workspace.invalid_password_title', 'Invalid Password'), this.passwordRuleMessage);
      return;
    }

    if (this.changePasswordNew !== this.changePasswordConfirm) {
      this.toast.error(
        this.t('workspace.password_mismatch_title', 'Password Mismatch'),
        this.t('workspace.password_mismatch_message', 'New password and confirm password should match.')
      );
      return;
    }

    this.toast.info(
      this.t('workspace.change_password_ready_title', 'Change Password Ready'),
      this.t('workspace.change_password_ready_message', 'The profile password screen is ready. Connect the backend API to complete password updates.')
    );
    this.closeChangePasswordDialog();
  }

  t(key: string, fallbackText: string): string {
    return this.appTranslation.t(key, fallbackText);
  }

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
    const routeScope = Number(this.routeScopeMap.get(this.activeMenuKey) ?? COMMON_MENU_SCOPE);

    if (routeScope === FRONT_OFFICE_SCOPE || routeScope === BACK_OFFICE_SCOPE) {
      this.currentOfficeScope = routeScope;
    }

    this.applyOfficeScope(this.activeMenuKey);
  }

  async loadorganizationconfig(): Promise<void> {
    const orgId = Number(this.userDetails.OrganizationId ?? this.userDetails.OrgId ?? 0);

    if (!orgId) {
      this.applyOrganizationTheme();
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetOrganizationConfigByOrgId(orgId));
      const config = response?.result;

      if (config) {
        const themeColor = String(config.ThemeColor ?? config.themeColor ?? '#7b3b1e');
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
    const groupedMenus: MenuGroup[] = [];

    menus.forEach((menu) => {
      const commonItems = (menu.SubMenus ?? []).filter((subMenu) => this.getMenuScope(menu.Menuscope, subMenu.Menuscope) === COMMON_MENU_SCOPE);
      const frontOfficeItems = (menu.SubMenus ?? []).filter((subMenu) => this.getMenuScope(menu.Menuscope, subMenu.Menuscope) === FRONT_OFFICE_SCOPE);
      const backOfficeItems = (menu.SubMenus ?? []).filter((subMenu) => this.getMenuScope(menu.Menuscope, subMenu.Menuscope) === BACK_OFFICE_SCOPE);

      if (commonItems.length) {
        groupedMenus.push(this.createMenuGroup(menu, commonItems, COMMON_MENU_SCOPE, 'Common'));
      }

      if (frontOfficeItems.length) {
        groupedMenus.push(this.createMenuGroup(menu, frontOfficeItems, FRONT_OFFICE_SCOPE, 'Front Office'));
      }

      if (backOfficeItems.length) {
        groupedMenus.push(this.createMenuGroup(menu, backOfficeItems, BACK_OFFICE_SCOPE, 'Back Office'));
      }
    });

    return groupedMenus;
  }

  private createMenuGroup(menu: ApiMenu, subMenus: any[], sectionScope: number, sectionLabel: string): MenuGroup {
    return {
      key: `${menu.MenuId}-${sectionScope}`,
      label: menu.MenuName,
      icon: menu.MenuIcon ?? 'pi pi-circle',
      sectionScope,
      sectionLabel,
      items: subMenus.map((subMenu) => ({
        key: String(subMenu.SubMenuId),
        label: subMenu.SubMenuName,
        description: subMenu.Remarks ?? '',
        route: subMenu.Route,
        entityNo: Number(subMenu.EntityNo || 0)
      }))
    };
  }

  private getMenuScope(menuScope: number | undefined, subMenuScope: number | undefined): number {
    const scope = Number(subMenuScope ?? menuScope ?? COMMON_MENU_SCOPE);

    if (scope === FRONT_OFFICE_SCOPE || scope === BACK_OFFICE_SCOPE) {
      return scope;
    }

    return COMMON_MENU_SCOPE;
  }

  private applyOfficeScope(route: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const routeScope = Number(this.routeScopeMap.get(route) ?? COMMON_MENU_SCOPE);
    const scope = routeScope === FRONT_OFFICE_SCOPE || routeScope === BACK_OFFICE_SCOPE
      ? routeScope
      : this.currentOfficeScope;
    const officeScope = scope === FRONT_OFFICE_SCOPE
      ? 'front-office'
      : scope === BACK_OFFICE_SCOPE
        ? 'back-office'
        : 'common';

    this.document.documentElement.setAttribute('data-office', officeScope);
  }

  private buildOfficeOptions(groups: MenuGroup[]): MenuOfficeOption[] {
    const availableScopes = new Set<number>();

    groups.forEach((group) => {
      const scope = Number(group.sectionScope ?? COMMON_MENU_SCOPE);

      if (scope === FRONT_OFFICE_SCOPE || scope === BACK_OFFICE_SCOPE) {
        availableScopes.add(scope);
      }
    });

    return [
      ...(availableScopes.has(FRONT_OFFICE_SCOPE) ? [{ label: 'Front Office', value: FRONT_OFFICE_SCOPE }] : []),
      ...(availableScopes.has(BACK_OFFICE_SCOPE) ? [{ label: 'Back Office', value: BACK_OFFICE_SCOPE }] : [])
    ];
  }

  private resolveInitialOfficeScope(): number {
    const routeScope = Number(this.routeScopeMap.get(this.activeMenuKey) ?? COMMON_MENU_SCOPE);

    if (routeScope === FRONT_OFFICE_SCOPE || routeScope === BACK_OFFICE_SCOPE) {
      return routeScope;
    }

    if (this.officeOptions.length === 1) {
      return Number(this.officeOptions[0].value);
    }

    if (this.officeOptions.length > 1 && !this.officeOptions.some((option) => Number(option.value) === FRONT_OFFICE_SCOPE)) {
      return Number(this.officeOptions[0].value);
    }

    if (Number(this.userDetails.RoleId || 0) === 1 || this.userDetails.IsAdmin === true || this.userDetails.IsAdmin === 1) {
      return BACK_OFFICE_SCOPE;
    }

    if (this.officeOptions.length) {
      return Number(this.officeOptions[0].value);
    }

    return FRONT_OFFICE_SCOPE;
  }

  private applyOrganizationTheme(themeColor = '#7b3b1e', fontSize = 14): void {
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
      return '#7b3b1e';
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

  private isPasswordValid(password: string): boolean {
    const value = password.trim();

    if (value.length < 6) {
      return false;
    }

    return /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[@#$%&*]/.test(value);
  }

  private readonly appTranslation = inject(AppTranslationService);
}
