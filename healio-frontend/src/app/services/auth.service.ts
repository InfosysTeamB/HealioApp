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
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  height?: string;
  weight?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  address?: string;
  city?: string;
  pincode?: string;
  profile?: any;
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

  setDoctorSession(doctorSession: any): void {
    const session: UserSession = {
      token: doctorSession.token || 'healio-demo-doctor-jwt',
      username: doctorSession.email ? doctorSession.email.split('@')[0] : 'dr_ramesh_rao',
      name: doctorSession.name || 'Dr. Ramesh Rao',
      email: doctorSession.email,
      phone: doctorSession.phone,
      role: 'doctor',
      doctor_id: doctorSession.doctorId || doctorSession.doctor_id || 'DOC-CRD-01'
    };
    this.currentUserSubject.next(session);
    this.currentUser.set(session);
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

  updatePatientProfile(profileData: Partial<UserSession>): UserSession {
    const current = this.getUser() || {
      token: 'patient-token',
      username: 'patient',
      role: 'patient' as const,
      name: profileData.name || 'Namala Harshitha'
    };

    const updatedUser: UserSession = {
      ...current,
      ...profileData,
      name: profileData.name || current.name,
      phone: profileData.phone || current.phone,
      email: profileData.email || current.email,
      date_of_birth: profileData.date_of_birth ?? current.date_of_birth,
      gender: profileData.gender ?? current.gender,
      blood_group: profileData.blood_group ?? current.blood_group,
      height: profileData.height ?? current.height,
      weight: profileData.weight ?? current.weight,
      allergies: profileData.allergies ?? current.allergies,
      chronic_conditions: profileData.chronic_conditions ?? current.chronic_conditions,
      current_medications: profileData.current_medications ?? current.current_medications,
      emergency_contact_name: profileData.emergency_contact_name ?? current.emergency_contact_name,
      emergency_contact_phone: profileData.emergency_contact_phone ?? current.emergency_contact_phone,
      emergency_contact_relation: profileData.emergency_contact_relation ?? current.emergency_contact_relation,
      address: profileData.address ?? current.address,
      city: profileData.city ?? current.city,
      pincode: profileData.pincode ?? current.pincode
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('healio_user', JSON.stringify(updatedUser));
      localStorage.setItem('healio_patient_profile', JSON.stringify(updatedUser));
    }

    this.currentUserSubject.next(updatedUser);
    this.currentUser.set(updatedUser);

    // Optional background sync with backend API
    this.http.post(`${this.baseUrl}/patients/`, {
      full_name: updatedUser.name,
      contact_phone: updatedUser.phone || '9441283233',
      contact_email: updatedUser.email || 'patient@healio.health',
      date_of_birth: updatedUser.date_of_birth || '1998-06-15',
      profile: {
        blood_group: updatedUser.blood_group || 'B+',
        gender: updatedUser.gender || 'Female',
        allergies: updatedUser.allergies || 'None',
        chronic_conditions: updatedUser.chronic_conditions || 'None',
        emergency_contact_name: updatedUser.emergency_contact_name || '',
        emergency_contact_phone: updatedUser.emergency_contact_phone || ''
      }
    }).subscribe({
      next: () => {},
      error: () => {}
    });

    return updatedUser;
  }
}