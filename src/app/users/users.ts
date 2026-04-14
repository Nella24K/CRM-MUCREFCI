import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { UserService } from '../services/user';
import { User } from '../models/user';
import { ToastrService } from 'ngx-toastr';
import { ParametrageService } from '../services/parametrage';
import { ApiError } from '../services/api';
import { Subscription, catchError, finalize, of, switchMap, throwError, timeout, timer } from 'rxjs';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  users: User[] = [];
  usersFiltres: User[] = [];
  usersAffiches: User[] = [];
  pageSize = 5;
  currentPage = 1;
  
  // Filtres
  recherche: string = '';
  filtreRole: string = 'tous';
  filtreStatut: string = 'tous';

  // Options de filtres
  roles = [
    { value: 'tous', label: 'Tous les rôles' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'superviseur', label: 'Superviseur' },
    { value: 'agent', label: 'Agent' }
  ];

  statuts = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'en_pause', label: 'En pause' },
    { value: 'hors_ligne', label: 'Hors ligne' }
  ];

  // Modal création/édition
  showUserModal: boolean = false;
  isEditing: boolean = false;
  isSaving: boolean = false;
  private saveFailSafeId: ReturnType<typeof setTimeout> | null = null;
  private createRecoverySubscription: Subscription | null = null;
  isLoadingRoles = false;
  roleLoadError = '';
  currentUser: User | null = null;
  private readonly defaultRoleOptions: Array<{ value: User['role']; label: string }> = [
    { value: 'agent', label: 'Agent' },
    { value: 'superviseur', label: 'Superviseur' },
    { value: 'admin', label: 'Administrateur' },
  ];
  roleOptionsForForm: Array<{ value: User['role']; label: string }> = [...this.defaultRoleOptions];
  newUser = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'agent' as User['role'],
    statut: 'actif' as User['statut'],
    equipe: '',
    competences: [] as string[],
    langues: ['fr'] as string[],
    specialites: [] as string[]
  };

  // Modal suppression
  showDeleteModal: boolean = false;
  userToDelete: User | null = null;

  constructor(
    private userService: UserService,
    private parametrageService: ParametrageService,
    private router: Router,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRolesForUserForm();
  }

  private loadRolesForUserForm(): void {
    this.isLoadingRoles = true;
    this.roleLoadError = '';

    this.parametrageService.getRoles().subscribe({
      next: (response) => {
        const apiRoles = this.extractRoleOptions(response);
        this.roleOptionsForForm = this.mergeRoleOptionsWithDefaults(apiRoles);
        this.isLoadingRoles = false;
      },
      error: () => {
        this.roleLoadError = 'Impossible de charger la liste des rôles.';
        this.roleOptionsForForm = [...this.defaultRoleOptions];
        this.isLoadingRoles = false;
      },
    });
  }

  private mergeRoleOptionsWithDefaults(
    apiRoles: Array<{ value: User['role']; label: string }>
  ): Array<{ value: User['role']; label: string }> {
    const merged: Array<{ value: User['role']; label: string }> = [...this.defaultRoleOptions];

    for (const role of apiRoles) {
      const index = merged.findIndex((item) => item.value === role.value);
      if (index >= 0) {
        merged[index] = role;
      } else {
        merged.push(role);
      }
    }

    return merged;
  }

  private extractRoleOptions(payload: unknown): Array<{ value: User['role']; label: string }> {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: unknown }).data
      : [];

    if (!Array.isArray(rawList)) {
      return [];
    }

    const options = rawList
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const role = item as Record<string, unknown>;
        const label = [role['label'], role['name'], role['nom']]
          .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

        const normalizedRole = this.normalizeRoleValue(role['code'] ?? role['key'] ?? role['label'] ?? role['name']);
        if (!normalizedRole) {
          return null;
        }

        return {
          value: normalizedRole,
          label: label || this.getRoleLabel(normalizedRole),
        };
      })
      .filter((item): item is { value: User['role']; label: string } => item !== null);

    // Évite les doublons de valeur de rôle
    return options.filter(
      (option, index, array) => array.findIndex((candidate) => candidate.value === option.value) === index
    );
  }

  private normalizeRoleValue(value: unknown): User['role'] | null {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();

    if (normalized === 'admin' || normalized === 'administrateur') return 'admin';
    if (normalized === 'superviseur') return 'superviseur';
    if (normalized === 'agent') return 'agent';
    return null;
  }

  loadUsers(): void {
    const snapshot = this.userService.getUsersSnapshot();
    const hadSnapshot = snapshot.length > 0;
    if (hadSnapshot) {
      this.users = snapshot;
      this.applyFilters();
    }

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilters();
      },
      error: (error) => {
        if (!hadSnapshot) {
          this.toastr.error('Erreur lors du chargement des utilisateurs', 'Erreur');
        }
        console.error('Erreur chargement utilisateurs:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Recherche
    if (this.recherche.trim()) {
      const searchLower = this.recherche.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower) ||
          user.nom.toLowerCase().includes(searchLower) ||
          user.prenom.toLowerCase().includes(searchLower)
      );
    }

    if (this.filtreRole !== 'tous') {
      filtered = filtered.filter((user) => user.role === this.filtreRole);
    }

    if (this.filtreStatut !== 'tous') {
      filtered = filtered.filter((user) => user.statut === this.filtreStatut);
    }

    this.usersFiltres = filtered;
    this.refreshPagination();
  }

  onRechercheChange(): void {
    this.applyFilters();
  }

  onFiltreChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.recherche = '';
    this.filtreRole = 'tous';
    this.filtreStatut = 'tous';
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.refreshPagination();
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  get totalPages(): number {
    const total = Math.ceil(this.usersFiltres.length / this.pageSize);
    return total > 0 ? total : 1;
  }

  get paginationStart(): number {
    if (this.usersFiltres.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.usersFiltres.length);
  }

  // Ouvrir modal création
  openCreateModal(): void {
    this.stopSavingState();
    this.isEditing = false;
    this.currentUser = null;
    this.newUser = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      role: 'agent',
      statut: 'actif',
      equipe: '',
      competences: [],
      langues: ['fr'],
      specialites: []
    };
    this.showUserModal = true;
  }

  // Ouvrir modal édition
  openEditModal(user: User): void {
    this.stopSavingState();
    this.isEditing = true;
    this.currentUser = user;
    this.newUser = {
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
      statut: user.statut,
      equipe: user.equipe || '',
      competences: user.competences || [],
      langues: user.langues || ['fr'],
      specialites: user.specialites || []
    };
    this.showUserModal = true;
  }

  // Fermer modal
  closeUserModal(): void {
    this.showUserModal = false;
    this.currentUser = null;
    this.stopCreateRecoveryWatcher();
    this.stopSavingState();
  }

  // Sauvegarder utilisateur
  saveUser(): void {
    if (this.isSaving) {
      return;
    }

    // Validation création: payload API = email + role
    if (!this.isEditing && (!this.newUser.email || !this.newUser.role)) {
      this.toastr.warning('Veuillez renseigner email et rôle.', 'Attention');
      return;
    }

    // Validation édition (formulaire complet actuel)
    if (this.isEditing && (!this.newUser.nom || !this.newUser.prenom || !this.newUser.email)) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires', 'Attention');
      return;
    }

    // Vérifier format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUser.email)) {
      this.toastr.warning('Veuillez entrer une adresse email valide', 'Attention');
      return;
    }

    this.startSavingState();
    const createdEmail = this.newUser.email.trim().toLowerCase();

    if (this.isEditing && this.currentUser) {
      // Mise à jour
      this.userService.updateUser(this.currentUser.id, this.newUser).subscribe({
        next: (user) => {
          this.isSaving = false;
          this.closeUserModal();
          this.loadUsers();
          this.toastr.success(`Utilisateur "${user.prenom} ${user.nom}" modifié avec succès`, 'Succès');
        },
        error: (error) => {
          this.isSaving = false;
          this.toastr.error('Erreur lors de la modification de l\'utilisateur', 'Erreur');
          console.error('Erreur modification utilisateur:', error);
        }
      });
    } else {
      // Création
      this.startCreateRecoveryWatcher(createdEmail);
      this.userService
        .createUser(this.newUser)
        .pipe(
          timeout(20000),
          catchError((error) =>
            this.userService.getUsers().pipe(
              switchMap((users) => {
                const exists = users.some((u) => u.email.toLowerCase() === createdEmail);
                if (exists) {
                  return of({ recovered: true });
                }
                return throwError(() => error);
              })
            )
          ),
          finalize(() => {
            this.stopSavingState();
          })
        )
        .subscribe({
        next: (createdUser) => {
          this.stopCreateRecoveryWatcher();
          this.stopSavingState();
          const created =
            createdUser && typeof createdUser === 'object' && 'email' in createdUser
              ? (createdUser as User)
              : null;
          this.handleUserCreated(created, this.newUser.email, this.newUser.role);
        },
        error: (error) => {
          this.stopCreateRecoveryWatcher();
          this.stopSavingState();
          const message =
            error instanceof ApiError
              ? `Création impossible (${error.status}) : ${error.statusText}`
              : 'Erreur lors de la création de l\'utilisateur';
          this.toastr.error(message, 'Erreur');
          console.error('Erreur création utilisateur:', error);
        }
      });
    }
  }

  private startSavingState(): void {
    this.ngZone.run(() => {
      this.isSaving = true;
      if (this.saveFailSafeId) {
        clearTimeout(this.saveFailSafeId);
      }
      this.saveFailSafeId = setTimeout(() => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.saveFailSafeId = null;
        });
      }, 25000);
    });
  }

  private stopSavingState(): void {
    this.ngZone.run(() => {
      this.isSaving = false;
      if (this.saveFailSafeId) {
        clearTimeout(this.saveFailSafeId);
        this.saveFailSafeId = null;
      }
    });
  }

  private startCreateRecoveryWatcher(email: string): void {
    this.stopCreateRecoveryWatcher();
    const targetEmail = email.trim().toLowerCase();

    this.createRecoverySubscription = timer(2500, 2500)
      .pipe(
        switchMap(() =>
          this.userService.getUsers().pipe(
            catchError(() => of([] as User[]))
          )
        )
      )
      .subscribe((users) => {
        const created = users.some((user) => user.email.trim().toLowerCase() === targetEmail);
        if (!created || !this.isSaving) {
          return;
        }

        this.stopCreateRecoveryWatcher();
        this.stopSavingState();
        const foundUser = users.find((user) => user.email.trim().toLowerCase() === targetEmail) ?? null;
        this.handleUserCreated(foundUser, email, this.newUser.role);
      });
  }

  private stopCreateRecoveryWatcher(): void {
    if (this.createRecoverySubscription) {
      this.createRecoverySubscription.unsubscribe();
      this.createRecoverySubscription = null;
    }
  }

  private handleUserCreated(createdUser: User | null, createdEmail: string, createdRole: User['role']): void {
    const fallbackUser: User = {
      id: createdUser?.id || `tmp-${Date.now()}`,
      nom: createdUser?.nom || '',
      prenom: createdUser?.prenom || '',
      email: (createdUser?.email || createdEmail).trim().toLowerCase(),
      role: createdUser?.role || createdRole,
      statut: createdUser?.statut || 'actif',
      dateEntree: createdUser?.dateEntree || new Date(),
      equipe: createdUser?.equipe,
      competences: createdUser?.competences || [],
      langues: createdUser?.langues || ['fr'],
      specialites: createdUser?.specialites || [],
    };

    // Force la visibilité du nouvel utilisateur dans le tableau.
    this.recherche = '';
    this.filtreRole = 'tous';
    this.filtreStatut = 'tous';
    this.currentPage = 1;
    this.insertOrReplaceUserInList(fallbackUser);

    // Fermeture immédiate du popup dès confirmation de création.
    this.showUserModal = false;
    this.currentUser = null;
    this.stopCreateRecoveryWatcher();
    this.stopSavingState();
    this.cdr.detectChanges();

    // Revenir explicitement sur la liste puis synchroniser les données.
    this.router.navigate(['/users']).finally(() => {
      this.loadUsers();
    });
    this.toastr.success(`Utilisateur "${fallbackUser.email}" créé avec succès`, 'Succès');
  }

  private insertOrReplaceUserInList(user: User): void {
    const emailKey = user.email.trim().toLowerCase();
    const index = this.users.findIndex(
      (candidate) =>
        (user.id && candidate.id === user.id) ||
        candidate.email.trim().toLowerCase() === emailKey
    );

    if (index >= 0) {
      this.users[index] = { ...this.users[index], ...user };
    } else {
      this.users = [user, ...this.users];
    }

    this.applyFilters();
  }

  // Ouvrir modal suppression
  openDeleteModal(user: User): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  // Fermer modal suppression
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  // Supprimer utilisateur
  deleteUser(): void {
    if (!this.userToDelete) return;

    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadUsers();
        this.toastr.success(`Utilisateur "${this.userToDelete!.prenom} ${this.userToDelete!.nom}" supprimé avec succès`, 'Succès');
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la suppression de l\'utilisateur', 'Erreur');
        console.error('Erreur suppression utilisateur:', error);
      }
    });
  }

  // Activer/Désactiver utilisateur
  toggleUserStatus(user: User): void {
    const newStatus = user.statut === 'actif' ? 'hors_ligne' : 'actif';
    this.userService.updateUser(user.id, { statut: newStatus }).subscribe({
      next: () => {
        this.loadUsers();
        this.toastr.success(`Statut de l'utilisateur mis à jour`, 'Succès');
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la mise à jour du statut', 'Erreur');
        console.error('Erreur mise à jour statut:', error);
      }
    });
  }

  // Utilitaires
  getRoleLabel(role: User['role']): string {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'superviseur': 'Superviseur',
      'agent': 'Agent'
    };
    return labels[role] || role;
  }

  getStatutLabel(statut: User['statut']): string {
    const labels: { [key: string]: string } = {
      'actif': 'Actif',
      'en_pause': 'En pause',
      'hors_ligne': 'Hors ligne'
    };
    return labels[statut] || statut;
  }

  getStatutClass(statut: User['statut']): string {
    return `statut-${statut}`;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getUserDisplayName(user: User): string {
    return `${user.prenom} ${user.nom}`;
  }

  trackByUserId(index: number, user: User): string {
    return user.id || `user-${index}`;
  }

  trackByTextValue(index: number, value: string): string {
    return `${value}-${index}`;
  }

  trackByOptionValue(index: number, option: { value: string }): string {
    return option.value || `option-${index}`;
  }

  // Gestion compétences
  addCompetence(): void {
    const competence = prompt('Entrez une compétence:');
    if (competence && competence.trim()) {
      if (!this.newUser.competences.includes(competence.trim())) {
        this.newUser.competences.push(competence.trim());
      }
    }
  }

  removeCompetence(competence: string): void {
    this.newUser.competences = this.newUser.competences.filter(c => c !== competence);
  }

  // Gestion spécialités
  addSpecialite(): void {
    const specialite = prompt('Entrez une spécialité:');
    if (specialite && specialite.trim()) {
      if (!this.newUser.specialites.includes(specialite.trim())) {
        this.newUser.specialites.push(specialite.trim());
      }
    }
  }

  removeSpecialite(specialite: string): void {
    this.newUser.specialites = this.newUser.specialites.filter(s => s !== specialite);
  }

  private refreshPagination(): void {
    const maxPage = this.totalPages;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.usersAffiches = this.usersFiltres.slice(start, end);
  }
}
