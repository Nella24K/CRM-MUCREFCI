import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { ToastrService } from 'ngx-toastr';
import { toFriendlyErrorMessage } from '../utils/error-messages';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  rememberMe: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  /** Logo affiché au-dessus du formulaire (vide = pas d'image) */
  logoSrc: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez renseigner votre email et mot de passe.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password, this.rememberMe).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Connexion réussie', 'Succès');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        const apiMessage = toFriendlyErrorMessage(error, 'login');
        this.errorMessage = apiMessage;
        this.toastr.error(
          apiMessage,
          'Connexion impossible'
        );
      }
    });
  }
}
 