import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth';
import { toFriendlyErrorMessage } from '../../utils/error-messages';

/** Même clé que dans forgot-password (après OTP validé). */
const PWD_RESET_SESSION_KEY = 'crm_pwd_reset';

interface PwdResetPayload {
  email: string;
  otp: string;
}

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  isLoading = false;
  private loadingFailSafeId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as PwdResetPayload | undefined;
    if (state?.email && state?.otp) {
      this.email = state.email.trim();
      this.otp = state.otp.trim();
    }
  }

  ngOnInit(): void {
    if (!this.email || !this.otp) {
      const raw = sessionStorage.getItem(PWD_RESET_SESSION_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PwdResetPayload;
          if (parsed.email && parsed.otp) {
            this.email = String(parsed.email).trim();
            this.otp = String(parsed.otp).trim();
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  get canSubmit(): boolean {
    return !!(this.email && this.otp);
  }

  submit(): void {
    if (!this.canSubmit) {
      this.errorMessage = 'Session expirée ou invalide. Reprenez depuis la demande de code OTP.';
      return;
    }
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Veuillez renseigner le nouveau mot de passe et sa confirmation.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.startLoading();
    this.errorMessage = '';
    this.authService.resetPassword(this.email, this.otp, this.newPassword).pipe(
      timeout(20000),
      finalize(() => this.stopLoading())
    ).subscribe({
      next: () => {
        this.stopLoading();
        sessionStorage.removeItem(PWD_RESET_SESSION_KEY);
        this.toastr.success('Mot de passe réinitialisé. Vous pouvez vous connecter.', 'Succès');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.stopLoading();
        this.errorMessage = toFriendlyErrorMessage(error, 'reset-password');
      },
    });
  }

  goBackToOtp(): void {
    this.router.navigate(['/forgot-password/otp'], {
      queryParams: { email: this.email || undefined },
    });
  }

  goLogin(): void {
    this.router.navigate(['/login']);
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
