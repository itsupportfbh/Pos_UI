import { CanActivateFn, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';
const SHIFT_ASSIGNMENT_KEY = 'shiftAssignment';

const isExePlatform = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent ?? '';
  if (userAgent.toLowerCase().includes('electron')) {
    return true;
  }

  const win = window as any;
  if (win?.process?.type === 'renderer' || win?.process?.versions?.electron) {
    return true;
  }

  try {
    const platform = Capacitor.getPlatform?.();
    return Capacitor.isNativePlatform() && ['windows', 'electron'].includes(platform ?? '');
  } catch {
    return false;
  }
};

const loginPageGuard: CanActivateFn = () => {
  if (isExePlatform()) {
    return inject(Router).createUrlTree(['/exe-login']);
  }

  return true;
};

const exeLoginGuard: CanActivateFn = () => {
  if (!isExePlatform()) {
    return inject(Router).createUrlTree(['/login']);
  }

  return true;
};

const isLoggedIn = (): boolean => {
  try {
    const loginSession = localStorage.getItem(LOGIN_SESSION_KEY);
    const userDetails = localStorage.getItem(USER_DETAILS_KEY);

    if (!loginSession || !userDetails) {
      return false;
    }

    const session = JSON.parse(loginSession);
    const user = JSON.parse(userDetails);
    return !!session.Token && !!user.UserId;
  } catch {
    return false;
  }
};

const authGuard: CanActivateFn = () => {
  if (isLoggedIn()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login']);
};

const loginRedirectGuard: CanActivateFn = () => {
  if (!isLoggedIn()) {
    return true;
  }

  if (!isShiftAssigned()) {
    return true;
  }

  return inject(Router).createUrlTree(['/pos']);
};

const isShiftAssigned = (): boolean => {
  try {
    const shift = localStorage.getItem(SHIFT_ASSIGNMENT_KEY);

    if (!shift) {
      return false;
    }

    const parsedShift = JSON.parse(shift);

    return !!parsedShift.shiftId;
  } catch {
    return false;
  }
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((module) => module.LoginComponent),
    canActivate: [loginPageGuard, loginRedirectGuard]
  },
  {
    path: 'exe-login',
    loadComponent: () => import('./pages/login/login-exe.component').then((module) => module.LoginExeComponent),
    canActivate: [exeLoginGuard, loginRedirectGuard]
  },
  {
    path: 'pos',
    loadChildren: () => import('./pages/pos/config/routes').then((module) => module.POS_ROUTES),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];
