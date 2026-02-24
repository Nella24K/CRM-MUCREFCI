import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user';
import { User } from '../models/user';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  users: User[] = [];
  usersFiltres: User[] = [];
  
  // Filtres
  recherche: string = '';
  filtreRole: string = 'tous';
  filtreStatut: string = 'tous';
  filtreEquipe: string = 'toutes';

  // Options de filtres
  roles = [
    { value: 'tous', label: 'Tous les rôles' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'superviseur', label: 'Superviseur' },
    { value: 'agent_senior', label: 'Agent Senior' },
    { value: 'agent', label: 'Agent' },
    { value: 'stagiaire', label: 'Stagiaire' }
  ];

  statuts = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'en_pause', label: 'En pause' },
    { value: 'hors_ligne', label: 'Hors ligne' }
  ];

  equipes = [
    { value: 'toutes', label: 'Toutes les équipes' },
    { value: 'Service Client', label: 'Service Client' },
    { value: 'Administration', label: 'Administration' }
  ];

  // Modal création/édition
  showUserModal: boolean = false;
  isEditing: boolean = false;
  isSaving: boolean = false;
  currentUser: User | null = null;
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
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilters();
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement des utilisateurs', 'Erreur');
        console.error('Erreur chargement utilisateurs:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Recherche
    if (this.recherche.trim()) {
      const searchLower = this.recherche.toLowerCase();
      filtered = filtered.filter(user =>
        user.nom.toLowerCase().includes(searchLower) ||
        user.prenom.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.equipe && user.equipe.toLowerCase().includes(searchLower))
      );
    }

    // Filtre rôle
    if (this.filtreRole !== 'tous') {
      filtered = filtered.filter(user => user.role === this.filtreRole);
    }

    // Filtre statut
    if (this.filtreStatut !== 'tous') {
      filtered = filtered.filter(user => user.statut === this.filtreStatut);
    }

    // Filtre équipe
    if (this.filtreEquipe !== 'toutes') {
      filtered = filtered.filter(user => user.equipe === this.filtreEquipe);
    }

    this.usersFiltres = filtered;
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
    this.filtreEquipe = 'toutes';
    this.applyFilters();
  }

  // Ouvrir modal création
  openCreateModal(): void {
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
  }

  // Sauvegarder utilisateur
  saveUser(): void {
    // Validation
    if (!this.newUser.nom || !this.newUser.prenom || !this.newUser.email) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires', 'Attention');
      return;
    }

    // Vérifier format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUser.email)) {
      this.toastr.warning('Veuillez entrer une adresse email valide', 'Attention');
      return;
    }

    this.isSaving = true;

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
      this.userService.createUser(this.newUser).subscribe({
        next: (user) => {
          this.isSaving = false;
          this.closeUserModal();
          this.loadUsers();
          this.toastr.success(`Utilisateur "${user.prenom} ${user.nom}" créé avec succès`, 'Succès');
        },
        error: (error) => {
          this.isSaving = false;
          this.toastr.error('Erreur lors de la création de l\'utilisateur', 'Erreur');
          console.error('Erreur création utilisateur:', error);
        }
      });
    }
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
      'agent_senior': 'Agent Senior',
      'agent': 'Agent',
      'stagiaire': 'Stagiaire'
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
}
