import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AppToastService } from '../../services/app-toast.service';
import { LoginService } from '../../services/login-exe.service';
import { ShiftAssignmentComponent } from '../pos/components/shift-assignment/shift-assignment.component';
import { ChangeDetectorRef } from '@angular/core';
import { MenuService } from '../../services/menu.service';

@Component({
  selector: 'app-login-exe',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, MessageModule, ShiftAssignmentComponent],
  templateUrl: './login-exe.component.html',
  styleUrl: './login-exe.component.css'
})
export class LoginExeComponent {
  readonly loginLogoUrl = 'cspl-logo.webp';
  readonly keypadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
  pin = '';
  errorMessage = '';
  loginSaving = false;
  loginSession: any = null;
  selectedUserDetails: any = null;
  showShiftAssignmentDialog = false;
  accessibleRoutes: string[] = [];
  showRoleDialog = false;
  userDetailsList: any[] = [];

  constructor(
    private readonly router: Router,
    private readonly toast: AppToastService,
    private readonly loginService: LoginService,
    private readonly menuService: MenuService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  get pinDigits(): string[] {
    return this.pin.split('').concat(Array(4 - this.pin.length).fill(''));
  }

  appendDigit(key: string): void {
    if (this.loginSaving || this.pin.length >= 4) {
      return;
    }
    this.errorMessage = '';
    this.pin += key;
  }

  clearPin(): void {
    if (this.loginSaving) {
      return;
    }
    this.pin = '';
    this.errorMessage = '';
  }

  async submit(): Promise<void> {
    debugger;
    if (this.pin.length !== 4) {
      this.errorMessage = 'Enter a 4-digit PIN to continue.';
      return;
    }

    this.loginSaving = true;
    this.errorMessage = '';

    const payload = {
      Pin: parseInt(this.pin)
    };

    try {
      // const status = await Network.getStatus();

      let response: any;

      if (navigator.onLine) {
        response = await firstValueFrom(
          this.loginService.login(payload)
        );
      } else {
        response = await this.loginService.loginOffline(
          parseInt(this.pin)
        );
      }

      const loginData = response.result ?? {};

      if (loginData && loginData.Status == true && response.ErrorInfo.Message == true) {
        const loginSession = {
          Expiration: loginData.Expiration ?? '',
          Token: loginData.Token ?? ''
        };

        const selectedUser = loginData.UserDetails?.[0] ?? null;
        if (selectedUser) {
          const userDetails = {
            IsAdmin: selectedUser.IsAdmin ?? false,
            UserId: selectedUser.UserId ?? '',
            UserCode: selectedUser.UserCode ?? '',
            EmpCode: selectedUser.EmpCode ?? '',
            UserName: selectedUser.UserName ?? '',
            Image: selectedUser.Image ?? selectedUser.UserImage ?? '',
            RoleId: selectedUser.RoleId ?? '',
            RoleName: selectedUser.RoleName ?? '',
            OrgId: selectedUser.OrgId ?? '',
            OrgName: selectedUser.OrgName ?? '',
            BranchId: selectedUser.BranchId ?? '',
            BranchName: selectedUser.BranchName ?? '',
            OrganizationId: selectedUser.OrganizationId ?? selectedUser.OrgId ?? '',
          };

          this.loginSession = loginSession;
          this.selectedUserDetails = userDetails;
          localStorage.setItem('loginSession', JSON.stringify(loginSession));
          localStorage.setItem('userDetails', JSON.stringify(userDetails));

          const orgId = Number(userDetails.OrganizationId ?? userDetails.OrgId ?? 0);
          const roleId = Number(userDetails.RoleId ?? 0);

          try {
            this.menuService.clearMenuCache();
            this.accessibleRoutes = await firstValueFrom(this.menuService.getAccessibleRoutes(orgId, roleId, true));

            if (!this.accessibleRoutes.length) {
              this.clearLoginState();
              this.showRoleDialog = false;
              this.toast.warn('No Page Rights', 'There is no any page rights for this user role.');
              this.cdr.detectChanges();
              return;
            }
          } catch {
            this.clearLoginState();
            this.showRoleDialog = false;
            this.toast.error('Login Failed', 'Unable to load page rights for this user role.');
            this.cdr.detectChanges();
            return;
          }

          this.showRoleDialog = false;
          this.selectedUserDetails = userDetails;

          this.showShiftAssignmentDialog = true;
          this.cdr.detectChanges();
          return;
        }

        this.errorMessage = 'Login succeeded but no role was found. Please contact your administrator.';
        return;
      }

      this.errorMessage = 'Invalid PIN or login credentials.';
    } catch (err) {
      console.error('Login Error:', err);
      this.errorMessage = 'Unable to login. Check your PIN and connection.';
    } finally {
      this.loginSaving = false;
    }
  }

  onShiftAssigned(event: any): void {
    localStorage.setItem('shiftAssignment', JSON.stringify(event));
    this.showShiftAssignmentDialog = false;

    this.toast.success(
      'Login Successful',
      `Welcome back, ${this.selectedUserDetails?.UserName || 'Cashier'}.`
    );

    this.router.navigate(['/pos']);
  }

  private clearLoginState(): void {
    localStorage.removeItem('loginSession');
    localStorage.removeItem('userDetails');
    localStorage.removeItem('shiftAssignment');
    this.loginSession = null;
    this.selectedUserDetails = null;
    this.userDetailsList = [];
    this.accessibleRoutes = [];
  }
}
