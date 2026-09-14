import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  selectedRole: 'patient' | 'doctor' = 'patient';
  email: string = '';
  password: string = '';
  doctorId: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['role'] === 'doctor' || params['role'] === 'patient') {
        this.selectedRole = params['role'];
      }
    });
  }

  setRole(role: 'patient' | 'doctor'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  onLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    if (this.selectedRole === 'doctor' && !this.doctorId) {
      this.errorMessage = 'Doctor ID is required for physician access.';
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;
      if (this.selectedRole === 'doctor') {
        this.router.navigate(['/doctor']);
      } else {
        this.router.navigate(['/patient']);
      }
    }, 700);
  }
}