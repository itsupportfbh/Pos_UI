import { CanActivateFn, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';

const AUTH_TOKEN_KEY = 'authToken';

const isLoggedIn = (): boolean => {
  try {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
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
