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
import { TextFieldComponent } from '../../components/form/text-field.component';
import { AppToastService } from '../../services/app-toast.service';
import { LoginService } from '../../services/login.service';
import { MenuService } from '../../services/menu.service';
import { ShiftAssignmentComponent } from '../pos/components/shift-assignment/shift-assignment.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, DialogModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, TextFieldComponent, ShiftAssignmentComponent],
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

  get isForgotPasswordEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.forgotEmail.trim());
  }

  constructor(
    private readonly router: Router,
    private readonly toast: AppToastService,
    private readonly loginService: LoginService,
    private readonly menuService: MenuService,
    private readonly changeDetector: ChangeDetectorRef
  ) { }

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
          this.selectUserDetails(loginData.UserDetails[0]);
          return;
        }

        if (loginData.UserDetails.length > 1) {
          this.userDetailsList = [...loginData.UserDetails];
          this.loginSaving = false;
          this.showRoleDialog = true;
          this.changeDetector.detectChanges();
          return;
        }

        this.toast.error('Login Failed', 'No role details found for this login.');
        return;
      }

      this.toast.error('Login Failed', 'Invalid email or password.');
    } catch {
      this.toast.error('Login Failed', 'Unable to login. Please check your credentials and try again.');
    } finally {
      this.loginSaving = false;
    }
  }

  selectUserDetails(selectedUserDetails: any): void {
    console.log('Selected User Details:', selectedUserDetails);
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
      BranchId: selectedUserDetails.BranchId ?? '',
      BranchName: selectedUserDetails.BranchName ?? ''
    };

    localStorage.setItem('loginSession', JSON.stringify(this.loginSession));
    localStorage.setItem('userDetails', JSON.stringify(userDetails));

    this.showRoleDialog = false;
    //this.toast.success('Login Successful', `Welcome back, ${userDetails.UserName || 'User'}.`);
    //this.router.navigate(['/pos']);
    this.selectedUserDetails = userDetails;

    // Save login session + user details first
    localStorage.setItem('loginSession', JSON.stringify(this.loginSession));
    localStorage.setItem('userDetails', JSON.stringify(userDetails));

    // Open mandatory shift assignment popup
    this.showShiftAssignmentDialog = true;
    this.changeDetector.detectChanges();
  }

  onShiftAssigned(event: any): void {
    localStorage.setItem('shiftAssignment', JSON.stringify(event));
    this.menuService.clearMenuCache();

    this.showShiftAssignmentDialog = false;

    this.toast.success(
      'Login Successful',
      `Welcome back, ${this.selectedUserDetails?.UserName || 'User'}.`
    );

    this.router.navigate(['/pos']);
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
      this.toast.warn('Email Required', 'Enter your email to continue with password reset.');
      return;
    }

    if (!this.isForgotPasswordEmailValid) {
      this.toast.warn('Invalid Email', this.forgotPasswordEmailMessage);
      return;
    }

    this.showForgotPasswordDialog = false;
    this.toast.info('Forgot Password Ready', `Password recovery is ready for ${email}. Connect the backend API to continue the actual reset flow.`);
  }
}
