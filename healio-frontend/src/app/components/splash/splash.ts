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

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './splash.html',
  styleUrl: './splash.css'
})
export class SplashComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  step = signal<'splash' | 'email' | 'otp'>('splash');
  email = signal<string>('harshithanamala04@gmail.com');
  otpDigits: string[] = ['', '', '', '', '', ''];
  isLoading = signal<boolean>(false);
  countdown = signal<number>(30);
  private timerRef: any;

  ngOnInit(): void {
    // 3.8s duration matches the ECG red line completion before settling into the card
    setTimeout(() => {
      this.step.set('email');
      this.cdr.detectChanges();
    }, 3800);
  }

  isValidEmail(): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(this.email().trim());
  }

  sendOtp(): void {
    if (!this.isValidEmail() || this.isLoading()) return;
    this.isLoading.set(true);

    this.http.post<any>('http://127.0.0.1:8000/api/auth/send-otp/', { 
      email: this.email().trim() 
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('otp');
        this.startCountdown();
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.otpInputs?.first) {
            this.otpInputs.first.nativeElement.focus();
          }
        }, 80);
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err.error?.error || 'Failed to dispatch passkey. Ensure backend is active.');
      }
    });
  }

  onOtpInput(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        this.otpDigits[index - 1] = '';
        this.focusInput(index - 1);
      }
      return;
    }

    if (input.value && index < 5 && /^[0-9]$/.test(event.key)) {
      this.focusInput(index + 1);
    }
  }

  private focusInput(index: number): void {
    const inputs = this.otpInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.focus();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d.trim().length === 1);
  }

  verifyOtp(): void {
    if (!this.isOtpComplete() || this.isLoading()) return;
    this.isLoading.set(true);
    const otp = this.otpDigits.join('');

    this.http.post<any>('http://127.0.0.1:8000/api/auth/verify-otp/', { 
      email: this.email().trim(), 
      otp 
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        localStorage.setItem('healio_token', res.token || 'healio-session-active');
        localStorage.setItem('healio_user_email', this.email().trim());
        
        // Immediate smooth transition to Landing Dashboard
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err.error?.error || 'Invalid or expired OTP code.');
      }
    });
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
    this.otpDigits = ['', '', '', '', '', ''];
    this.sendOtp();
  }
}