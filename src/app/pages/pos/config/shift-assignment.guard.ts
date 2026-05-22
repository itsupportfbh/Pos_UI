import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ShiftAssignmentService } from '../../../services/shift-assignment.service';

export const shiftAssignmentGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const loginSession = localStorage.getItem('loginSession');
  const userDetails = localStorage.getItem('userDetails');
  const shiftAssignment = localStorage.getItem('shiftAssignment');

  // Not logged in
  if (!loginSession || !userDetails) {
    router.navigate(['/login']);
    return false;
  }

  // Shift not assigned
  if (!shiftAssignment) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
