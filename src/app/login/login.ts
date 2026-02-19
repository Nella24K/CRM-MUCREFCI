import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  rememberMe: boolean = false;
  isLoading: boolean = false;

  constructor(private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      return;
    }

    this.isLoading = true;
    
    // Simuler une connexion (à remplacer par votre logique d'authentification)
    setTimeout(() => {
      this.isLoading = false;
      // Rediriger vers le dashboard après connexion
      this.router.navigate(['/dashboard']);
      console.log('Connexion avec:', { email: this.email, rememberMe: this.rememberMe });
    }, 2000);
  }

}
