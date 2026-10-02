import {
  Component,
  OnInit,
  signal,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, UserSession } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './splash.html',
  styleUrl: './splash.css'
})
export class SplashComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  // Two-phase sequence: 'splash' -> 'profile' -> 'otp'
  step = signal<'splash' | 'profile' | 'otp'>('splash');

  // Input fields start empty
  fullName = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');

  otpDigits: string[] = ['', '', '', ''];

  isSendingEmail = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successBanner = signal<string | null>(null);
  countdown = signal<number>(30);

  private timerRef: any;
  private splashTimerRef: any;

  private get authBaseUrl(): string {
    return `${environment.apiBaseUrl}/api/auth`;
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getUser();
      if (user?.role === 'doctor') {
        this.router.navigate(['/doctor-portal']);
      } else {
        this.router.navigate(['/home']);
      }
      return;
    }

    // Displays splash intro for 3.2 seconds before transitioning to profile setup
    this.splashTimerRef = setTimeout(() => {
      if (this.step() === 'splash') {
        this.goToProfilePhase();
      }
    }, 3200);
  }

  goToProfilePhase(): void {
    if (this.splashTimerRef) {
      clearTimeout(this.splashTimerRef);
    }
    this.step.set('profile');
    this.errorMessage.set(null);
    this.cdr.detectChanges();
  }

  isValidEmail(): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(this.email().trim());
  }

  isValidProfile(): boolean {
    const isTestingDoc = this.email().trim().toLowerCase() === 'dr.ramesh.rao@healio.health';
    if (isTestingDoc) return true;
    return this.isValidEmail() && this.fullName().trim().length >= 2;
  }

  // 1. Send OTP through Django Backend (with Demo Doctor Bypass)
  sendOtp(): void {
    const trimmedEmail = this.email().trim().toLowerCase();

    // Default testing doctor bypass
    if (trimmedEmail === 'dr.ramesh.rao@healio.health') {
      if (!this.fullName().trim()) {
        this.fullName.set('Dr. Ramesh Rao');
      }
      if (!this.phone().trim()) {
        this.phone.set('+91 98450 12345');
      }
      this.otpDigits = ['1', '2', '3', '4'];
      this.step.set('otp');
      this.successBanner.set('Demo Doctor Mode: Passcode auto-filled (1234)');
      this.errorMessage.set(null);
      this.cdr.detectChanges();

      setTimeout(() => {
        this.focusInput(3);
      }, 100);
      return;
    }

    if (!this.isValidProfile() || this.isSendingEmail()) return;

    this.isSendingEmail.set(true);
    this.errorMessage.set(null);

    const payload = {
      email: trimmedEmail
    };

    this.http.post<{ message?: string; error?: string; dev_otp?: string }>(`${this.authBaseUrl}/send-otp/`, payload)
      .subscribe({
        next: (res) => {
          this.isSendingEmail.set(false);
          this.successBanner.set(res.message || `Verification passkey sent to ${this.email().trim()}`);
          if (res.dev_otp) {
            console.log(`[Healio Dev Passkey]: ${res.dev_otp}`);
          }
          this.step.set('otp');
          this.startCountdown();
          this.cdr.detectChanges();

          setTimeout(() => {
            this.focusInput(0);
          }, 100);
        },
        error: (err) => {
          this.isSendingEmail.set(false);
          console.error('Django Send OTP Error:', err);
          const msg = err.error?.error || err.error?.message || 'Failed to dispatch email. Check backend server.';
          this.errorMessage.set(msg);
          this.cdr.detectChanges();
        }
      });
  }

  // 2. Dynamic DB-Driven Role Resolution on Verify OTP
  verifyOtp(): void {
    if (!this.isOtpComplete() || this.isLoading()) return;

    const trimmedEmail = this.email().trim().toLowerCase();
    const enteredOtp = this.otpDigits.join('').trim();

    // Default testing doctor bypass verification
    if (trimmedEmail === 'dr.ramesh.rao@healio.health' && enteredOtp === '1234') {
      // Clear any existing patient session
      localStorage.removeItem('healio_user');

      // Store healio_doctor_session
      const doctorSession = {
        doctorId: 'DOC-CRD-01',
        name: 'Dr. Ramesh Rao',
        email: 'dr.ramesh.rao@healio.health',
        phone: '+91 98450 12345',
        specialization: 'Cardiologist',
        clinic: 'Apollo Cradle Clinic',
        role: 'doctor',
        token: 'healio-demo-doctor-jwt'
      };

      localStorage.setItem('healio_doctor_session', JSON.stringify(doctorSession));
      localStorage.setItem('healio_role', 'doctor');

      // Sync into AuthService for app-wide state consistency
      this.authService.setDoctorSession(doctorSession);

      // Navigate directly to Doctor Portal workspace
      this.router.navigate(['/doctor-portal']);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      email: trimmedEmail,
      otp: enteredOtp
    };

    this.http.post<{
      message?: string;
      role?: 'doctor' | 'patient';
      token?: string;
      error?: string;
      doctor?: {
        doctorId: string;
        name: string;
        email: string;
        phone?: string;
        specialization?: string;
        clinic?: string;
        role?: string;
      };
      user?: {
        email: string;
        role?: string;
      };
    }>(
      `${this.authBaseUrl}/verify-otp/`,
      payload
    ).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        // Dynamic DB-Driven Role Resolution:
        if (res.role === 'doctor') {
          const docData = res.doctor || {
            doctorId: 'DOC-CARD-001',
            name: this.fullName().trim() || 'Dr. Ramesh Rao',
            email: this.email().trim(),
            phone: this.phone().trim(),
            specialization: 'Cardiologist',
            clinic: 'Apollo Cradle Clinic',
            role: 'doctor'
          };

          const doctorSession = {
            ...docData,
            token: res.token || ('healio-doctor-token-' + Date.now())
          };

          // Store doctor session and role in localStorage
          localStorage.setItem('healio_doctor_session', JSON.stringify(doctorSession));
          localStorage.setItem('healio_role', 'doctor');

          // Sync into AuthService for app-wide state consistency
          this.authService.setAuthenticatedUser({
            token: doctorSession.token,
            username: doctorSession.email.split('@')[0],
            name: doctorSession.name,
            email: doctorSession.email,
            phone: doctorSession.phone,
            role: 'doctor',
            doctor_id: doctorSession.doctorId
          });

          // Navigate directly to Doctor Portal workspace
          this.router.navigate(['/doctor-portal']);
        } else {
          // Standard Patient Role
          const userProfile: UserSession = {
            token: res.token || ('healio-jwt-session-' + Date.now()),
            username: this.email().split('@')[0] || 'patient_user',
            name: this.fullName().trim(),
            email: this.email().trim(),
            phone: this.phone().trim(),
            role: 'patient',
            patient_id: 'PT-' + Math.floor(10000 + Math.random() * 90000)
          };

          // Store patient session and role in localStorage
          localStorage.setItem('healio_user', JSON.stringify(userProfile));
          localStorage.setItem('healio_role', 'patient');
          this.authService.setAuthenticatedUser(userProfile);

          // Transition directly to landing page
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('OTP Verification Error:', err);
        this.errorMessage.set(err.error?.error || 'Invalid or expired passkey. Please check again.');
        this.cdr.detectChanges();
      }
    });
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (!input.value && index > 0) {
        this.otpDigits[index - 1] = '';
        this.focusInput(index - 1);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 3) {
      this.focusInput(index + 1);
    }
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value || '';
    const numericChar = val.replace(/\D/g, '').slice(-1);

    this.otpDigits[index] = numericChar;
    input.value = numericChar;
    this.errorMessage.set(null);
    this.cdr.detectChanges();

    if (numericChar && index < 3) {
      this.focusInput(index + 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.errorMessage.set(null);

    const pastedData = event.clipboardData?.getData('text') || '';
    const numericChars = pastedData.replace(/\D/g, '').slice(0, 4);

    if (!numericChars) return;

    for (let i = 0; i < 4; i++) {
      this.otpDigits[i] = numericChars[i] || '';
    }

    this.cdr.detectChanges();
    const nextIndex = Math.min(numericChars.length, 3);
    this.focusInput(nextIndex);
  }

  private focusInput(index: number): void {
    const inputs = this.otpInputs?.toArray();
    if (inputs && inputs[index]?.nativeElement) {
      inputs[index].nativeElement.focus();
      inputs[index].nativeElement.select?.();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.length === 4 && this.otpDigits.every(d => typeof d === 'string' && d.trim().length === 1);
  }

  dismissSuccessBanner(): void {
    this.successBanner.set(null);
  }

  dismissErrorMessage(): void {
    this.errorMessage.set(null);
  }

  startCountdown(): void {
    this.countdown.set(30);
    clearInterval(this.timerRef);
    this.timerRef = setInterval(() => {
      if (this.countdown() > 0) {
        this.countdown.update(c => c - 1);
      } else {
        clearInterval(this.timerRef);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  resendOtp(): void {
    if (this.countdown() > 0 || this.isSendingEmail()) return;
    this.otpDigits = ['', '', '', ''];
    this.sendOtp();
  }
}

