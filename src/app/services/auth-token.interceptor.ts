import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const loginSession = localStorage.getItem('loginSession');

  if (!loginSession) {
    return next(request);
  }

  const session = JSON.parse(loginSession);
  const token = session.Token ?? '';

  if (!token) {
    return next(request);
  }

  const requestWithToken = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(requestWithToken);
};




