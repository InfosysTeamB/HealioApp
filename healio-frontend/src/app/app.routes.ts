import { Routes } from '@angular/router';
import { SplashComponent } from './components/splash/splash';
import { LandingComponent } from './components/landing/landing';
import { PatientPortalComponent } from './components/patient-portal/patient-portal';
import { DoctorPortalComponent } from './components/doctor-portal/doctor-portal';
import { SecurityPortalComponent } from './components/security-portal/security-portal';
import { authGuard } from './guards/auth.guard';
import { onboardingGuard, splashGuard } from './guards/onboarding.guard';

export const routes: Routes = [
  // Root launch: starts at Splash onboarding (bypassed to /home if user already authenticated)
  { path: '', component: SplashComponent, canActivate: [splashGuard] },
  { path: 'splash', component: SplashComponent, canActivate: [splashGuard] },
  
  // Primary Dashboard: protected by onboardingGuard (redirects to /splash if not authenticated)
  { path: 'home', component: LandingComponent, canActivate: [onboardingGuard] },

  // Retired standalone /login redirected into integrated Splash onboarding screen
  { path: 'login', redirectTo: 'splash', pathMatch: 'full' },

  // Portals
  { 
    path: 'patient', 
    component: PatientPortalComponent, 
    canActivate: [authGuard],
    data: { role: 'patient' }
  },
  { path: 'patient-portal', redirectTo: 'patient', pathMatch: 'full' },
  { 
    path: 'doctor', 
    component: DoctorPortalComponent, 
    canActivate: [authGuard],
    data: { role: 'doctor' }
  },
  { path: 'doctor-portal', redirectTo: 'doctor', pathMatch: 'full' },
  { path: 'security', component: SecurityPortalComponent },
  { path: '**', redirectTo: '' }
];