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
import { AppToastService } from '../../services/app-toast.service';
import { LoginService } from '../../services/login.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, DialogModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  readonly isMobileApp = Capacitor.isNativePlatform();
  email = '';
  password = '';
  errorMessage = '';
  loginSaving = false;
  showRoleDialog = false;
  loginSession: any = null;
  userDetailsList: any[] = [];

  constructor(
    private readonly router: Router,
    private readonly toast: AppToastService,
    private readonly loginService: LoginService,
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
    const userDetails = {
      IsAdmin: selectedUserDetails.IsAdmin ?? false,
      UserId: selectedUserDetails.UserId ?? '',
      UserCode: selectedUserDetails.UserCode ?? '',
      EmpCode: selectedUserDetails.EmpCode ?? '',
      UserName: selectedUserDetails.UserName ?? '',
      RoleId: selectedUserDetails.RoleId ?? '',
      RoleName: selectedUserDetails.RoleName ?? '',
      OrgId: selectedUserDetails.OrgId ?? '',
      OrgName: selectedUserDetails.OrgName ?? '',
      BranchId: selectedUserDetails.BranchId ?? '',
      BranchName: selectedUserDetails.BranchName ?? ''
    };

    localStorage.setItem('loginSession', JSON.stringify(this.loginSession));
    localStorage.setItem('userDetails', JSON.stringify(userDetails));

    this.showRoleDialog = false;
    this.toast.success('Login Successful', `Welcome back, ${userDetails.UserName || 'User'}.`);
    this.router.navigate(['/pos']);
  }

  closeRoleDialog(): void {
    this.showRoleDialog = false;
    this.userDetailsList = [];
    this.loginSession = null;
  }
}
