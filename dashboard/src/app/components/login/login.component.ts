import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';
  loading: boolean = false;
  isLoginMode: boolean = true;
  organizationName: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.error = '';
    this.loading = true;

    if (this.isLoginMode) {
      this.authService
        .login({ email: this.email, password: this.password })
        .subscribe({
          next: (response) => {
            this.authService.setToken(response.access_token);
            this.loading = false;
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            if (err.status === 401) {
              this.error = err.error?.message || 'Invalid email or password. If you don\'t have an account, please register first.';
            } else {
              this.error = err.error?.message || 'Login failed. Please try again.';
            }
            this.loading = false;
          },
        });
    } else {
      this.authService
        .register({
          email: this.email,
          password: this.password,
          organizationName: this.organizationName,
        })
        .subscribe({
          next: (response) => {
            this.authService.setToken(response.access_token);
            this.loading = false;
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.error = err.error?.message || 'Registration failed. Please try again.';
            this.loading = false;
          },
        });
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
    this.email = '';
    this.password = '';
    this.organizationName = '';
  }
}

