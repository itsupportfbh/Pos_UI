import { inject } from '@angular/core';
import { CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { MenuService } from '../../../services/menu.service';

const USER_DETAILS_KEY = 'userDetails';
const ROUTE_ALIASES: Record<string, string[]> = {
  'kitchen-display': ['display-menu-items'],
  'display-menu-items': ['kitchen-display']
};

const getUserDetails = (): any => {
  try {
    return JSON.parse(localStorage.getItem(USER_DETAILS_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const normalizeRoute = (value: string | undefined): string => {
  return String(value ?? '').split('?')[0].split('#')[0].trim().toLowerCase();
};

const resolveAccess = (targetRoute: string, routes: string[], router: Router): boolean | UrlTree => {
  const allowedRoutes = routes.map((route) => normalizeRoute(route)).filter((route) => !!route);
  const targetRoutes = [targetRoute, ...(ROUTE_ALIASES[targetRoute] ?? [])];

  if (!allowedRoutes.length) {
    return router.createUrlTree(['/login']);
  }

  if (targetRoutes.some((route) => allowedRoutes.includes(route))) {
    return true;
  }

  return router.createUrlTree(['/pos', allowedRoutes[0]]);
};

export const posRouteAccessGuard: CanActivateChildFn = (childRoute, state) => {
  const router = inject(Router);
  const menuService = inject(MenuService);
  const userDetails = getUserDetails();
  const orgId = Number(userDetails.OrganizationId ?? userDetails.OrgId ?? 0);
  const roleId = Number(userDetails.RoleId ?? 0);
  const targetRoute = normalizeRoute(childRoute.routeConfig?.path ?? state.url.split('/').filter(Boolean).at(-1) ?? 'dashboard');

  if (!roleId) {
    return router.createUrlTree(['/login']);
  }

  return menuService.getAccessibleRoutes(orgId, roleId).pipe(
    map((routes) => resolveAccess(targetRoute, routes, router)),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
