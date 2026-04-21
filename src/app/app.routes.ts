import { CanActivateFn, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';

const LOGIN_SESSION_KEY = 'loginSession';
const USER_DETAILS_KEY = 'userDetails';

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

  return inject(Router).createUrlTree(['/pos']);
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((module) => module.LoginComponent),
    canActivate: [loginRedirectGuard]
  },
  {
    path: 'pos',
    loadChildren: () => import('./pages/pos/config/routes').then((module) => module.POS_ROUTES),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];
