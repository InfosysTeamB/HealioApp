import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let user = authService.getUser();
  const expectedRole = route.data?.['role'];

  // Check doctor session from localStorage or authService
  if (expectedRole === 'doctor') {
    const role = typeof localStorage !== 'undefined' ? localStorage.getItem('healio_role') : null;
    const docSaved = typeof localStorage !== 'undefined' ? localStorage.getItem('healio_doctor_session') : null;
    if (role === 'doctor' && docSaved) {
      try {
        const doc = JSON.parse(docSaved);
        if (doc && doc.email) {
          return true;
        }
      } catch {}
    }
    if (user && user.role === 'doctor') {
      return true;
    }
    router.navigate(['/splash']);
    return false;
  }

  // Check patient session from localStorage or authService
  if (expectedRole === 'patient') {
    const patientSaved = typeof localStorage !== 'undefined' ? localStorage.getItem('healio_user') : null;
    if (patientSaved) {
      try {
        const p = JSON.parse(patientSaved);
        if (p && (p.email || p.username || p.name)) {
          return true;
        }
      } catch {}
    }
    if (user && user.role === 'patient') {
      return true;
    }
    router.navigate(['/splash']);
    return false;
  }

  if (!user) {
    router.navigate(['/splash']);
    return false;
  }

  return true;
};