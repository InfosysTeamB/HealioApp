import { Injectable } from '@angular/core';
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
  doctor_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserSession | null>;
  public currentUser$: Observable<UserSession | null>;

  private get baseUrl(): string {
    if (environment?.apiBaseUrl) {
      return environment.apiBaseUrl;
    }
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/v1`;
  }

  constructor(private http: HttpClient, private router: Router) {
    const savedUser = localStorage.getItem('healio_user');
    this.currentUserSubject = new BehaviorSubject<UserSession | null>(
      savedUser ? JSON.parse(savedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
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
      })
    );
  }

  loginWithGoogle(payload: { email: string; name: string; role: string }): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/auth/google/`, payload).pipe(
      tap((user: UserSession) => {
        localStorage.setItem('healio_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
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
      })
    );
  }

  registerPatientUser(patientData: any): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/patients/register-user/`, patientData).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
      })
    );
  }

  registerDoctorUser(doctorData: any): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.baseUrl}/doctors/register-user/`, doctorData).pipe(
      tap((session) => {
        localStorage.setItem('healio_user', JSON.stringify(session));
        this.currentUserSubject.next(session);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('healio_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getUser(): UserSession | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getUser();
  }

  updatePatientId(patientId: string): void {
    const current = this.getUser();
    if (current) {
      current.patient_id = patientId;
      localStorage.setItem('healio_user', JSON.stringify(current));
      this.currentUserSubject.next(current);
    }
  }
}