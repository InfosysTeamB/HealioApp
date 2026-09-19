import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * onboardingGuard:
 * Ensures only users with an active verified session in localStorage ('healio_user')
 * can access protected application routes (like /home).
 * If no session is found, redirects to /splash.
 */
export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const role = localStorage.getItem('healio_role');
    if (role === 'doctor' && localStorage.getItem('healio_doctor_session')) {
      return true;
    }

    const saved = localStorage.getItem('healio_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && (user.email || user.username || user.name)) {
          return true;
        }
      } catch {
        localStorage.removeItem('healio_user');
      }
    }
  }

  router.navigate(['/splash']);
  return false;
};

/**
 * splashGuard:
 * If a user is already authenticated/stored in localStorage:
 * - If role is 'doctor', bypasses to /doctor-portal
 * - If role is 'patient', bypasses to /home
 */
export const splashGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const role = localStorage.getItem('healio_role');
    const doctorSession = localStorage.getItem('healio_doctor_session');
    if (role === 'doctor' && doctorSession) {
      router.navigate(['/doctor-portal']);
      return false;
    }

    const saved = localStorage.getItem('healio_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && (user.email || user.username || user.name)) {
          router.navigate(['/home']);
          return false;
        }
      } catch {
        localStorage.removeItem('healio_user');
      }
    }
  }

  return true;
};
