import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';

@Component({
  selector: 'app-profil',
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil implements OnInit {
  currentUser = {
    id: '',
    nom: '',
    prenom: '',
    email: '',
    role: 'agent',
    statut: 'actif',
  };

  passwordForm = {
    newPassword: '',
    confirmPassword: '',
  };

  isSavingPassword = false;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  changePassword(): void {
    if (!this.currentUser.id) {
      this.toastr.error('Utilisateur non identifié.', 'Erreur');
      return;
    }

    const newPassword = this.passwordForm.newPassword.trim();
    const confirmPassword = this.passwordForm.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      this.toastr.warning('Renseigne le nouveau mot de passe et la confirmation.', 'Validation');
      return;
    }
    if (newPassword.length < 6) {
      this.toastr.warning('Le mot de passe doit contenir au moins 6 caractères.', 'Validation');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.toastr.warning('La confirmation du mot de passe ne correspond pas.', 'Validation');
      return;
    }

    this.isSavingPassword = true;
    this.userService.updatePassword(this.currentUser.id, newPassword).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordForm.newPassword = '';
        this.passwordForm.confirmPassword = '';
        this.toastr.success('Mot de passe mis à jour.', 'Succès');
      },
      error: () => {
        this.isSavingPassword = false;
        this.toastr.error('Impossible de mettre à jour le mot de passe.', 'Erreur');
      },
    });
  }

  get roleLabel(): string {
    if (this.currentUser.role === 'admin') return 'Administrateur';
    if (this.currentUser.role === 'superviseur') return 'Superviseur';
    return 'Agent';
  }

  private loadCurrentUser(): void {
    const stored = this.authService.getStoredUser() as Record<string, unknown> | null;
    if (!stored) {
      return;
    }

    this.currentUser = {
      id: this.getString(stored['id']) || this.getString(stored['userId']),
      nom: this.getString(stored['nom']) || this.getString(stored['lastname']),
      prenom: this.getString(stored['prenom']) || this.getString(stored['firstname']),
      email:
        this.getString(stored['email']) ||
        this.getString(stored['username']) ||
        this.getString(stored['login']),
      role: this.normalizeRole(stored['role']),
      statut: this.normalizeStatus(stored['statut'] ?? stored['status']),
    };
  }

  private getString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private normalizeRole(value: unknown): 'agent' | 'superviseur' | 'admin' {
    const role = String(value ?? '').toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'superviseur') return 'superviseur';
    return 'agent';
  }

  private normalizeStatus(value: unknown): 'actif' | 'en_pause' | 'hors_ligne' {
    const status = String(value ?? '').toLowerCase();
    if (status === 'en_pause') return 'en_pause';
    if (status === 'hors_ligne') return 'hors_ligne';
    return 'actif';
  }
}
