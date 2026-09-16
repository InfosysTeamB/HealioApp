import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRole = route.data?.['role'];
  if (expectedRole && user.role !== expectedRole) {
    // If a patient attempts to access doctor route or vice versa, redirect
    router.navigate([user.role === 'doctor' ? '/doctor' : '/patient']);
    return false;
  }

  return true;
};