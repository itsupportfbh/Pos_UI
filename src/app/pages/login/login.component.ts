import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AppToastService } from '../../services/app-toast.service';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_ROLE_KEY = 'userRole';
const AUTH_NAME_KEY = 'userName';
const AUTH_LOCATION_KEY = 'userLocation';

const DEMO_USERS = [
  { email: 'admin@antonypos.com', password: 'admin@123', role: 'Admin', name: 'Antony Admin', location: 'Head Office' },
  { email: 'staff@antonypos.com', password: 'staff@123', role: 'Staff', name: 'Maya Staff', location: 'Counter 1' }
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  readonly isMobileApp = Capacitor.isNativePlatform();
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private readonly router: Router,
    private readonly toast: AppToastService
  ) {}

  submit(): void {
    const matchedUser = DEMO_USERS.find(
      (user) => user.email === this.email.trim().toLowerCase() && user.password === this.password
    );

    if (!matchedUser) {
      this.errorMessage = 'Invalid email or password.';
      this.toast.error('Login Failed', 'Invalid email or password. Please try again.');
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, `mock-jwt-token-${matchedUser.role.toLowerCase()}`);
    localStorage.setItem(AUTH_ROLE_KEY, matchedUser.role);
    localStorage.setItem(AUTH_NAME_KEY, matchedUser.name);
    localStorage.setItem(AUTH_LOCATION_KEY, matchedUser.location);
    this.errorMessage = '';
    this.toast.success('Login Successful', `Welcome back, ${matchedUser.name}.`);
    this.router.navigate(['/pos']);
  }
}
