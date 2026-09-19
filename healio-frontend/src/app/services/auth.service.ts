import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';

export interface UserSession {
  token: string;
  username: string;
  role: 'patient' | 'doctor';
  name: string;
  patient_id?: string;
  email?: string;
  phone?: string;
  doctor_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserSession | null>;
  public currentUser$: Observable<UserSession | null>;
  public readonly currentUser = signal<UserSession | null>(null);

  private get baseUrl(): string {
    if (environment?.apiBaseUrl) {
      return environment.apiBaseUrl;
    }
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/v1`;
  }

  constructor(private http: HttpClient, private router: Router) {
    let initialUser: UserSession | null = null;
    if (typeof localStorage !== 'undefined') {
      const role = localStorage.getItem('healio_role');
      const savedDoc = localStorage.getItem('healio_doctor_session');
      const savedUser = localStorage.getItem('healio_user');

      if (role === 'doctor' && savedDoc) {
        try {
          const doc = JSON.parse(savedDoc);
          initialUser = {
            token: doc.token || 'doctor-token',
            username: doc.email ? doc.email.split('@')[0] : 'doctor',
            name: doc.name || 'Dr. Ramesh Rao',
            email: doc.email,
            phone: doc.phone,
            role: 'doctor',
            doctor_id: doc.doctorId || doc.doctor_id || 'DOC-CARD-001'
          };
        } catch {}
      } else if (savedUser) {
        try {
          initialUser = JSON.parse(savedUser);
        } catch {}
      }
    }

    this.currentUserSubject = new BehaviorSubject<UserSession | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.currentUser.set(initialUser);
  }

  login(credentials: {
    username?: string;
    email?: string;
    doctor_id?: string;
    password: string;
    role: string;
  }): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/login/`, credentials).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
        this.currentUser.set(session);
      })
    );
  }

  loginWithGoogle(payload: { email: string; name: string; role: string }): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/auth/google/`, payload).pipe(
      tap((user: UserSession) => {
        localStorage.setItem('healio_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.currentUser.set(user);
      })
    );
  }

  loginWithGoogleProfile(
    googleProfile: any,
    role: 'patient' | 'doctor' = 'patient'
  ): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/auth/google/`, { ...googleProfile, role }).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
        this.currentUser.set(session);
      })
    );
  }

  registerPatientUser(patientData: any): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/patients/register-user/`, patientData).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
        this.currentUser.set(session);
      })
    );
  }

  registerDoctorUser(doctorData: any): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/doctors/register-user/`, doctorData).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
        this.currentUser.set(session);
      })
    );
  }

  loginDemoPatient(): UserSession {
    const demoUser: UserSession = {
      token: 'demo-jwt-token-healio',
      username: 'alex_johnson',
      name: 'Alex Johnson',
      email: 'alex.johnson@healio.health',
      phone: '+91 98765 43210',
      role: 'patient',
      patient_id: 'PT-88341'
    };
    this.setAuthenticatedUser(demoUser);
    return demoUser;
  }

  loginDemoDoctor(): UserSession {
    const demoDoctor: UserSession = {
      token: 'demo-jwt-doctor-healio',
      username: 'dr_ramesh_rao',
      name: 'Dr. Ramesh Rao',
      email: 'dr.ramesh.rao@healio.health',
      phone: '+91 98450 12345',
      role: 'doctor',
      doctor_id: 'DOC-CARD-001'
    };
    this.setAuthenticatedUser(demoDoctor);
    return demoDoctor;
  }

  setAuthenticatedUser(user: UserSession): void {
    localStorage.setItem('healio_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
  }

  logout(redirect: boolean = true): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('healio_user');
      localStorage.removeItem('healio_doctor_session');
      localStorage.removeItem('healio_role');
    }
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
    if (redirect) {
      this.router.navigate(['/splash']);
    }
  }

  getUser(): UserSession | null {
    return this.currentUser();
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  updatePatientId(patientId: string): void {
    const current = this.getUser();
    if (current) {
      current.patient_id = patientId;
      localStorage.setItem('healio_user', JSON.stringify(current));
      this.currentUserSubject.next(current);
      this.currentUser.set({ ...current });
    }
  }
}