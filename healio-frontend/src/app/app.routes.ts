import { Routes } from '@angular/router';
import { SplashComponent } from './components/splash/splash';
import { LandingComponent } from './components/landing/landing';
import { LoginComponent } from './components/login/login';
import { PatientPortalComponent } from './components/patient-portal/patient-portal';
import { DoctorPortalComponent } from './components/doctor-portal/doctor-portal';
import { authGuard } from './guards/auth.guard';
import { SecurityPortalComponent } from './components/security-portal/security-portal';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { 
    path: 'patient', 
    component: PatientPortalComponent, 
    canActivate: [authGuard],
    data: { role: 'patient' }
  },
  { 
    path: 'doctor', 
    component: DoctorPortalComponent, 
    canActivate: [authGuard],
    data: { role: 'doctor' }
  },
  { path: 'security', component: SecurityPortalComponent },
  { path: '**', redirectTo: '' }
];