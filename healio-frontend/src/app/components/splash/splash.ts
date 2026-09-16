import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.css'
})
export class SplashComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Allows full letter-fill (2s) + heartbeat cycle (2.8s) before navigating
    setTimeout(() => {
      this.router.navigate(['/landing']);
    }, 4500); 
  }
}