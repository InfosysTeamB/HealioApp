import { Routes } from '@angular/router';
import { SplashComponent } from './components/splash/splash';
import { LandingComponent } from './components/landing/landing';
import { LoginComponent } from './components/login/login';
import { PatientPortalComponent } from './components/patient-portal/patient-portal';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'home', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'patient', component: PatientPortalComponent },
  { path: '**', redirectTo: 'home' }
];