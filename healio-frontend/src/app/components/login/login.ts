import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, UserSession } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  selectedRole: 'patient' | 'doctor' = 'patient';
  isRegistering: boolean = false;

  // Login credentials
  doctorId: string = '';
  email: string = '';
  password: string = '';

  // Patient Registration Form Data
  registerData = {
    full_name: '',
    contact_email: '',
    password: '',
    contact_phone: '',
    date_of_birth: '',
    profile: {
      blood_group: 'O+',
      gender: 'Male',
      allergies: 'None reported',
      chronic_conditions: 'None',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    }
  };

  // Doctor Registration Form Data
  doctorRegisterData = {
    full_name: '',
    email: '',
    password: '',
    specialization: 'Cardiology',
    department: 'Outpatient Clinical Care',
    doctor_id: '',
    contact_phone: ''
  };

  isLoading: boolean = false;
  errorMessage: string = '';

  // Google Sign-In & Development Fallback Modal
  showGoogleModal: boolean = false;
  showClientIdConfig: boolean = false;
  customGoogleEmail: string = '';
  customGoogleName: string = '';
  configuredGoogleClientId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Load configured Google Client ID from localStorage if saved
    const savedClientId = localStorage.getItem('healio_google_client_id');
    this.configuredGoogleClientId = savedClientId || environment.googleClientId || '';

    this.route.queryParams.subscribe((params) => {
      if (params['role'] === 'doctor' || params['role'] === 'patient') {
        this.selectedRole = params['role'];
      }
      if (params['mode'] === 'register') {
        this.isRegistering = true;
      }
    });
  }

  ngAfterViewInit(): void {
    // Google Identity Services initializes on click
  }

  setRole(role: 'patient' | 'doctor'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  setAuthMode(register: boolean): void {
    this.isRegistering = register;
    this.errorMessage = '';
  }

  hasValidGoogleClientId(): boolean {
    const id = (this.configuredGoogleClientId || '').trim();
    // Validate that it is not empty and not the placeholder
    return !!id && id.length > 20 && !id.includes('healioapp.apps.googleusercontent.com') && id.endsWith('.apps.googleusercontent.com');
  }

  onLogin(): void {
    const docId = this.doctorId.trim();
    const mail = this.email.trim();

    let identifier = '';
    if (this.selectedRole === 'doctor') {
      identifier = docId || mail;
      if (!identifier) {
        this.errorMessage = 'Please provide your Doctor ID or Clinical Email.';
        return;
      }
    } else {
      identifier = mail || docId;
      if (!identifier) {
        this.errorMessage = 'Please provide your email address.';
        return;
      }
    }

    if (!this.password) {
      this.errorMessage = 'Please provide your password.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({
      username: identifier,
      email: mail || undefined,
      doctor_id: docId || undefined,
      password: this.password,
      role: this.selectedRole
    }).subscribe({
      next: (res) => this.handlePostLoginRedirect(res),
      error: (err) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to Healio backend at http://localhost:8000. Please ensure the Django server is running.';
        } else {
          this.errorMessage = err.error?.error || 'Invalid credentials. Please verify and try again.';
        }
      }
    });
  }

  onRegisterPatient(): void {
    if (!this.registerData.full_name || !this.registerData.contact_email || !this.registerData.password) {
      this.errorMessage = 'Please provide full name, email, and password.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.registerPatientUser(this.registerData).subscribe({
      next: (res) => this.handlePostLoginRedirect(res),
      error: (err) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to Healio backend at http://localhost:8000. Please ensure the Django server is running.';
        } else {
          this.errorMessage = err.error?.error || 'Registration failed. Please check your entries.';
        }
      }
    });
  }

  onRegisterDoctor(): void {
    if (!this.doctorRegisterData.full_name || !this.doctorRegisterData.email || !this.doctorRegisterData.password) {
      this.errorMessage = 'Please provide physician full name, clinical email, and password.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      full_name: this.doctorRegisterData.full_name.trim(),
      email: this.doctorRegisterData.email.trim().toLowerCase(),
      password: this.doctorRegisterData.password,
      specialization: this.doctorRegisterData.specialization,
      department: this.doctorRegisterData.department || 'Outpatient Clinical Care',
      doctor_id: this.doctorRegisterData.doctor_id.trim() || undefined,
      contact_phone: this.doctorRegisterData.contact_phone.trim() || '555-0100'
    };

    this.authService.registerDoctorUser(payload).subscribe({
      next: (res) => this.handlePostLoginRedirect(res),
      error: (err) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to Healio backend at http://localhost:8000. Please ensure the Django server is running.';
        } else {
          this.errorMessage = err.error?.error || 'Physician registration failed. Please check your entries.';
        }
      }
    });
  }

  onGoogleSignInClick(): void {
    this.errorMessage = '';

    // If user has configured a valid Google Cloud Client ID, use authentic Google GIS
    if (this.hasValidGoogleClientId() && typeof google !== 'undefined' && google.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.configuredGoogleClientId.trim(),
          scope: 'email profile openid',
          prompt: 'select_account',
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.isLoading = true;
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              })
              .then((res) => {
                if (!res.ok) throw new Error('Failed to retrieve user profile from Google');
                return res.json();
              })
              .then((googleProfile) => {
                this.authService.loginWithGoogleProfile(googleProfile, this.selectedRole).subscribe({
                  next: (res) => this.handlePostLoginRedirect(res),
                  error: (err) => {
                    this.isLoading = false;
                    this.errorMessage = err.error?.error || 'Google Authentication failed.';
                  }
                });
              })
              .catch((err) => {
                this.isLoading = false;
                this.errorMessage = 'Google profile retrieval failed: ' + (err.message || err);
              });
            } else if (tokenResponse?.error) {
              this.errorMessage = 'Google Sign-In was cancelled or failed (' + tokenResponse.error + ').';
            }
          }
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err: any) {
        console.warn('Google Identity Services initialization failed, falling back to account picker:', err);
      }
    }

    // Otherwise, open the sleek Google Sign-In account selector modal
    this.showGoogleModal = true;
  }

  signInWithGoogleAccount(email: string, name: string): void {
    this.showGoogleModal = false;
    this.isLoading = true;
    this.errorMessage = '';

    const googleProfile = {
      email: email.trim().toLowerCase(),
      name: name.trim() || email.split('@')[0],
      sub: 'google-uid-' + Math.random().toString(36).substring(2, 10)
    };

    this.authService.loginWithGoogleProfile(googleProfile, this.selectedRole).subscribe({
      next: (res) => this.handlePostLoginRedirect(res),
      error: (err) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to Healio backend at http://localhost:8000. Please ensure the Django server is running.';
        } else {
          this.errorMessage = err.error?.error || 'Google Authentication failed.';
        }
      }
    });
  }

  submitCustomGoogleAccount(): void {
    if (!this.customGoogleEmail.trim()) {
      return;
    }
    this.signInWithGoogleAccount(this.customGoogleEmail, this.customGoogleName);
  }

  saveGoogleClientId(): void {
    const trimmed = this.configuredGoogleClientId.trim();
    if (trimmed) {
      localStorage.setItem('healio_google_client_id', trimmed);
    } else {
      localStorage.removeItem('healio_google_client_id');
    }
    this.showClientIdConfig = false;
    this.showGoogleModal = false;
    if (this.hasValidGoogleClientId()) {
      this.onGoogleSignInClick();
    }
  }

  closeGoogleModal(): void {
    this.showGoogleModal = false;
    this.showClientIdConfig = false;
  }

  handlePostLoginRedirect(session: UserSession): void {
    this.isLoading = false;
    if (session.role === 'doctor') {
      this.router.navigate(['/doctor']);
    } else {
      this.router.navigate(['/patient']);
    }
  }
}