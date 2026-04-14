import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth';
import { finalize, timeout } from 'rxjs';
import { toFriendlyErrorMessage } from '../utils/error-messages';

const PWD_RESET_SESSION_KEY = 'crm_pwd_reset';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword implements OnInit {
  step: 1 | 2 = 1;
  isLoading = false;
  private loadingFailSafeId: ReturnType<typeof setTimeout> | null = null;
  email = '';
  otp = '';
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) {
      this.email = emailFromQuery;
    }

    if (this.router.url.startsWith('/forgot-password/otp')) {
      this.step = 2;
    }
  }

  sendOtp(): void {
    if (!this.email) {
      this.errorMessage = 'Veuillez renseigner votre email.';
      return;
    }
    this.startLoading();
    this.errorMessage = '';
    this.authService.requestOtp(this.email).pipe(
      timeout(20000),
      finalize(() => this.stopLoading())
    ).subscribe({
      next: () => {
        this.stopLoading();
        this.step = 2;
        this.toastr.success('Vous avez recu le code OTP par email. Saisissez-le pour continuer.', 'Succès');
        this.router.navigate(['/forgot-password/otp'], {
          queryParams: { email: this.email.trim() },
        });
      },
      error: (error) => {
        this.stopLoading();
        this.errorMessage = toFriendlyErrorMessage(error, 'request-otp');
      },
    });
  }

  checkOtp(): void {
    if (!this.otp) {
      this.errorMessage = 'Veuillez renseigner le code OTP.';
      return;
    }
    this.startLoading();
    this.errorMessage = '';
    this.authService.verifyOtp(this.email, this.otp).pipe(
      timeout(20000),
      finalize(() => this.stopLoading())
    ).subscribe({
      next: () => {
        this.stopLoading();
        this.toastr.success('Code OTP vérifié.', 'Succès');
        sessionStorage.setItem(
          PWD_RESET_SESSION_KEY,
          JSON.stringify({ email: this.email.trim(), otp: this.otp.trim() })
        );
        this.router.navigate(['/forgot-password/reset']);
      },
      error: (error) => {
        this.stopLoading();
        this.errorMessage = toFriendlyErrorMessage(error, 'verify-otp');
      },
    });
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }

  goBackStep(): void {
    if (this.step === 2) {
      this.step = 1;
      this.errorMessage = '';
      this.router.navigate(['/forgot-password']);
      return;
    }
  }

  private startLoading(): void {
    this.isLoading = true;
    if (this.loadingFailSafeId) {
      clearTimeout(this.loadingFailSafeId);
    }
    this.loadingFailSafeId = setTimeout(() => {
      this.isLoading = false;
      this.errorMessage = 'Le serveur met trop de temps à répondre. Réessayez.';
    }, 25000);
  }

  private stopLoading(): void {
    this.isLoading = false;
    if (this.loadingFailSafeId) {
      clearTimeout(this.loadingFailSafeId);
      this.loadingFailSafeId = null;
    }
  }
}
