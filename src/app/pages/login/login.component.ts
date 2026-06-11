import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { firstValueFrom } from 'rxjs';
import { AppTranslatePipe } from '../../pipes/app-translate.pipe';
import { TextFieldComponent } from '../../components/form/text-field.component';
import { AppLocaleService } from '../../services/app-locale.service';
import { AppToastService } from '../../services/app-toast.service';
import { AppTranslationService } from '../../services/app-translation.service';
import { CommonService } from '../../services/common.service';
import { LoginService } from '../../services/login.service';
import { MenuService } from '../../services/menu.service';
import { ShiftAssignmentComponent } from '../pos/components/shift-assignment/shift-assignment.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, DialogModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, TextFieldComponent, ShiftAssignmentComponent, AppTranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  readonly isMobileApp = Capacitor.isNativePlatform();
  readonly loginLogoUrl = 'cspl-logo.webp';
  readonly forgotPasswordEmailMessage = 'Enter a valid email address to continue.';
  email = '';
  password = '';
  forgotEmail = '';
  forgotPasswordSubmitted = false;
  errorMessage = '';
  loginSaving = false;
  showRoleDialog = false;
  showForgotPasswordDialog = false;
  loginSession: any = null;
  userDetailsList: any[] = [];
  showShiftAssignmentDialog = false;
  selectedUserDetails: any = null;
  accessibleRoutes: string[] = [];

  get isForgotPasswordEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.forgotEmail.trim());
  }

  constructor(
    private readonly router: Router,
    private readonly appLocale: AppLocaleService,
    private readonly appTranslation: AppTranslationService,
    private readonly toast: AppToastService,
    private readonly commonService: CommonService,
    private readonly loginService: LoginService,
    private readonly menuService: MenuService,
    private readonly changeDetector: ChangeDetectorRef
  ) { }

  t(key: string, fallbackText: string): string {
    return this.appTranslation.t(key, fallbackText);
  }

  async submit(): Promise<void> {
    this.loginSaving = true;

    const payload = {
      Email: this.email.trim(),
      Password: this.password
    };

    try {
      const response: any = await firstValueFrom(this.loginService.login(payload));

      const loginData = response.result ?? {};

      if (loginData && loginData.Status == true && response.ErrorInfo.Message == true) {

        this.loginSession = {
          Expiration: loginData.Expiration ?? '',
          Token: loginData.Token ?? '',
        };

        if (loginData.UserDetails.length && loginData.UserDetails.length == 1) {
          await this.selectUserDetails(loginData.UserDetails[0]);
          return;
        }

        if (loginData.UserDetails.length > 1) {
          this.userDetailsList = [...loginData.UserDetails];
          this.loginSaving = false;
          this.showRoleDialog = true;
          this.changeDetector.detectChanges();
          return;
        }

        this.toast.error(
          this.t('login.failed_title', 'Login Failed'),
          this.t('login.no_role_details', 'No role details found for this login.')
        );
        return;
      }

      this.toast.error(
        this.t('login.failed_title', 'Login Failed'),
        this.t('login.invalid_credentials', 'Invalid email or password.')
      );
    } catch {
      this.toast.error(
        this.t('login.failed_title', 'Login Failed'),
        this.t('login.unable_to_login', 'Unable to login. Please check your credentials and try again.')
      );
    } finally {
      this.loginSaving = false;
    }
  }

  async selectUserDetails(selectedUserDetails: any): Promise<void> {
    const userDetails = {
      IsAdmin: selectedUserDetails.IsAdmin ?? false,
      UserId: selectedUserDetails.UserId ?? '',
      UserCode: selectedUserDetails.UserCode ?? '',
      EmpCode: selectedUserDetails.EmpCode ?? '',
      UserName: selectedUserDetails.UserName ?? '',
      Image: selectedUserDetails.Image ?? selectedUserDetails.UserImage ?? '',
      RoleId: selectedUserDetails.RoleId ?? '',
      RoleName: selectedUserDetails.RoleName ?? '',
      OrganizationId: selectedUserDetails.OrganizationId ?? selectedUserDetails.OrgId ?? '',
      OrgId: selectedUserDetails.OrgId ?? selectedUserDetails.OrganizationId ?? '',
      OrgName: selectedUserDetails.OrgName ?? '',
      OrgLanguageCode: selectedUserDetails.OrgLanguageCode ?? '',
      OrgCurrencyCode: selectedUserDetails.OrgCurrencyCode ?? '',
      OrgCurrencyName: selectedUserDetails.OrgCurrencyName ?? '',
      OrgCurrencySymbol: selectedUserDetails.OrgCurrencySymbol ?? '',
      OrgTimezone: selectedUserDetails.OrgTimezone ?? '',
      OrgCountry: selectedUserDetails.OrgCountry ?? 0,
      OrgState: selectedUserDetails.OrgState ?? 0,
      OrgCity: selectedUserDetails.OrgCity ?? 0,
      BranchId: selectedUserDetails.BranchId ?? '',
      BranchName: selectedUserDetails.BranchName ?? '',
      BranchLanguageCode: selectedUserDetails.BranchLanguageCode ?? '',
      BranchCurrencyCode: selectedUserDetails.BranchCurrencyCode ?? '',
      BranchCurrencyName: selectedUserDetails.BranchCurrencyName ?? '',
      BranchCurrencySymbol: selectedUserDetails.BranchCurrencySymbol ?? '',
      BranchTimezone: selectedUserDetails.BranchTimezone ?? '',
      BranchCountry: selectedUserDetails.BranchCountry ?? 0,
      BranchState: selectedUserDetails.BranchState ?? 0,
      BranchCity: selectedUserDetails.BranchCity ?? 0,
      LanguageCode: this.firstNonEmpty(
        selectedUserDetails.BranchLanguageCode,
        selectedUserDetails.OrgLanguageCode
      )
    };

    await this.refreshUserLocaleContext(userDetails);

    const orgId = Number(userDetails.OrganizationId ?? userDetails.OrgId ?? 0);
    const roleId = Number(userDetails.RoleId ?? 0);

    localStorage.setItem('loginSession', JSON.stringify(this.loginSession));
    localStorage.setItem('userDetails', JSON.stringify(userDetails));
    this.appLocale.syncFromUserDetails(userDetails);
    await this.appTranslation.reload(userDetails.LanguageCode);

    try {
      this.menuService.clearMenuCache();
      this.accessibleRoutes = await firstValueFrom(this.menuService.getAccessibleRoutes(orgId, roleId, true));

      if (!this.accessibleRoutes.length) {
        this.clearLoginState();
        this.showRoleDialog = false;
        this.toast.warn(
          this.t('login.no_page_rights_title', 'No Page Rights'),
          this.t('login.no_page_rights_message', 'There is no any page rights for this user role.')
        );
        this.changeDetector.detectChanges();
        return;
      }
    } catch {
      this.clearLoginState();
      this.showRoleDialog = false;
      this.toast.error(
        this.t('login.failed_title', 'Login Failed'),
        this.t('login.unable_to_load_page_rights', 'Unable to load page rights for this user role.')
      );
      this.changeDetector.detectChanges();
      return;
    }

    this.showRoleDialog = false;
    this.selectedUserDetails = userDetails;

    // Open mandatory shift assignment popup
    this.showShiftAssignmentDialog = true;
    this.changeDetector.detectChanges();
  }

  async onShiftAssigned(event: any): Promise<void> {
    localStorage.setItem('shiftAssignment', JSON.stringify(event));
    this.menuService.clearMenuCache();

    try {
      const accessibleRoutes = this.accessibleRoutes.length ? this.accessibleRoutes : [];

      if (!accessibleRoutes.length) {
        this.clearLoginState();
        this.showShiftAssignmentDialog = false;
        this.toast.warn(
          this.t('login.no_page_rights_title', 'No Page Rights'),
          this.t('login.no_page_rights_message', 'There is no any page rights for this user role.')
        );
        this.changeDetector.detectChanges();
        return;
      }

      this.showShiftAssignmentDialog = false;
      const userName = this.selectedUserDetails?.UserName || this.t('common.user', 'User');
      const shiftName = String(event?.shiftName || '').trim();
      const successMessage = shiftName
        ? `${this.t('login.welcome_back_prefix', 'Welcome back,')} ${userName}. ${shiftName} assigned.`
        : `${this.t('login.welcome_back_prefix', 'Welcome back,')} ${userName}.`;

      this.toast.success(
        this.t('login.success_title', 'Login Successful'),
        successMessage
        `${this.t('login.welcome_back_prefix', 'Welcome back,')} ${this.selectedUserDetails?.UserName || this.t('common.user', 'User')}.`
      );

      await this.router.navigate(['/pos', accessibleRoutes[0]]);
    } catch {
      this.clearLoginState();
      this.showShiftAssignmentDialog = false;
      this.toast.error(
        this.t('login.failed_title', 'Login Failed'),
        this.t('login.unable_to_load_page_rights', 'Unable to load page rights for this user role.')
      );
      this.changeDetector.detectChanges();
    }
  }

  closeRoleDialog(): void {
    this.showRoleDialog = false;
    this.userDetailsList = [];
    this.loginSession = null;
  }

  openForgotPasswordDialog(): void {
    this.forgotPasswordSubmitted = false;
    this.forgotEmail = this.email.trim();
    this.showForgotPasswordDialog = true;
  }

  closeForgotPasswordDialog(): void {
    this.forgotPasswordSubmitted = false;
    this.showForgotPasswordDialog = false;
  }

  continueToResetPassword(): void {
    this.forgotPasswordSubmitted = true;
    const email = this.forgotEmail.trim();

    if (!email) {
      this.toast.warn(
        this.t('login.email_required_title', 'Email Required'),
        this.t('login.email_required_message', 'Enter your email to continue with password reset.')
      );
      return;
    }

    if (!this.isForgotPasswordEmailValid) {
      this.toast.warn(
        this.t('login.invalid_email_title', 'Invalid Email'),
        this.t('login.invalid_email_message', this.forgotPasswordEmailMessage)
      );
      return;
    }

    this.showForgotPasswordDialog = false;
    this.toast.info(
      this.t('login.forgot_password_ready_title', 'Forgot Password Ready'),
      `${this.t('login.forgot_password_ready_prefix', 'Password recovery is ready for')} ${email}. ${this.t('login.forgot_password_ready_suffix', 'Connect the backend API to continue the actual reset flow.')}`
    );
  }

  private clearLoginState(): void {
    localStorage.removeItem('loginSession');
    localStorage.removeItem('userDetails');
    localStorage.removeItem('shiftAssignment');
    this.appTranslation.clear();
    this.appLocale.clear();
    this.loginSession = null;
    this.selectedUserDetails = null;
    this.userDetailsList = [];
    this.accessibleRoutes = [];
  }

  private async refreshUserLocaleContext(userDetails: any): Promise<void> {
    try {
      const countriesResponse: any = await firstValueFrom(this.commonService.GetCountry());
      const countries = countriesResponse?.result ?? [];

      const orgCountry = countries.find((country: any) => Number(country.Id || 0) === Number(userDetails.OrgCountry || 0));
      const branchCountry = countries.find((country: any) => Number(country.Id || 0) === Number(userDetails.BranchCountry || 0));

      if (orgCountry) {
        userDetails.OrgCurrencyCode = orgCountry.Currency ?? userDetails.OrgCurrencyCode ?? '';
        userDetails.OrgCurrencyName = orgCountry.CurrencyName ?? userDetails.OrgCurrencyName ?? '';
        userDetails.OrgCurrencySymbol = orgCountry.CurrencySymbol ?? userDetails.OrgCurrencySymbol ?? '';
      }

      if (branchCountry) {
        userDetails.BranchCurrencyCode = branchCountry.Currency ?? userDetails.BranchCurrencyCode ?? '';
        userDetails.BranchCurrencyName = branchCountry.CurrencyName ?? userDetails.BranchCurrencyName ?? '';
        userDetails.BranchCurrencySymbol = branchCountry.CurrencySymbol ?? userDetails.BranchCurrencySymbol ?? '';
      } else if (Number(userDetails.BranchId || 0) <= 0) {
        userDetails.BranchCurrencyCode = '';
        userDetails.BranchCurrencyName = '';
        userDetails.BranchCurrencySymbol = '';
      }

      userDetails.OrgTimezone = await this.resolveTimezone(
        Number(userDetails.OrgCountry || 0),
        Number(userDetails.OrgState || 0),
        Number(userDetails.OrgCity || 0),
        userDetails.OrgTimezone
      );

      userDetails.BranchTimezone = await this.resolveTimezone(
        Number(userDetails.BranchCountry || 0),
        Number(userDetails.BranchState || 0),
        Number(userDetails.BranchCity || 0),
        userDetails.BranchTimezone
      );

      if (Number(userDetails.BranchId || 0) <= 0) {
        userDetails.BranchLanguageCode = '';
        userDetails.BranchTimezone = '';
      }
    } catch {
      // Keep login working even if locale refresh endpoints are unavailable.
    }
  }

  private async resolveTimezone(
    countryId: number,
    stateId: number,
    cityId: number,
    fallbackTimezone: string
  ): Promise<string> {
    try {
      if (stateId > 0) {
        const citiesResponse: any = await firstValueFrom(this.commonService.GetCityByStateId(stateId));
        const cities = citiesResponse?.result ?? [];
        const selectedCity = cities.find((city: any) => Number(city.Id || 0) === cityId);
        if (selectedCity?.Timezone) {
          return String(selectedCity.Timezone).trim();
        }
      }

      if (countryId > 0) {
        const statesResponse: any = await firstValueFrom(this.commonService.GetStateByCountryId(countryId));
        const states = statesResponse?.result ?? [];
        const selectedState = states.find((state: any) => Number(state.Id || 0) === stateId);
        if (selectedState?.Timezone) {
          return String(selectedState.Timezone).trim();
        }
      }
    } catch {
      // Fall through to fallback below.
    }

    return String(fallbackTimezone ?? '').trim();
  }

  private firstNonEmpty(...values: Array<string | null | undefined>): string {
    return values.find((value) => String(value ?? '').trim())?.trim() ?? '';
  }
}
