import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../services/client';
import { Client } from '../models/client';
import { ApiError } from '../services/api';

@Component({
  selector: 'app-clients',
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class Clients implements OnInit {
  clients: Client[] = [];
  clientsFiltres: Client[] = [];
  clientsAffiches: Client[] = [];
  isLoading: boolean = false;
  deletingClientId: string | null = null;
  pageSize = 5;
  currentPage = 1;
  
  // Filtres
  recherche: string = '';
  filtreStatut: string = 'tous';
  filtreCreeParEmail: boolean | null = null; // null = tous, true = créés par email, false = autres
  filtreNouveauContact: boolean | null = null; // null = tous, true = avec tag "Nouveau Contact", false = sans tag

  // Options de filtres
  statuts = ['tous', 'actif', 'inactif', 'prospect'];

  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading = true;
    const snapshot = this.clientService.getClientsSnapshot();
    const hadSnapshot = snapshot.length > 0;

    if (hadSnapshot) {
      this.clients = snapshot;
      this.applyFilters();
      this.isLoading = false;
    }

    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        // Afficher un message d'erreur à l'utilisateur
        if (!hadSnapshot) {
          alert('Erreur lors du chargement des clients. Veuillez réessayer.');
        }
        // Réinitialiser les clients pour éviter les erreurs d'affichage
        if (!hadSnapshot) {
          this.clients = [];
          this.clientsFiltres = [];
        }
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.clients];

    // Recherche
    if (this.recherche.trim()) {
      const searchLower = this.recherche.toLowerCase();
      filtered = filtered.filter(client =>
        client.nom.toLowerCase().includes(searchLower) ||
        (client.matricule && client.matricule.toLowerCase().includes(searchLower)) ||
        (client.prenom && client.prenom.toLowerCase().includes(searchLower)) ||
        client.email.toLowerCase().includes(searchLower)
      );
    }

    // Filtre statut
    if (this.filtreStatut !== 'tous') {
      filtered = filtered.filter(client => client.statut === this.filtreStatut);
    }

    // Filtre créé par email
    if (this.filtreCreeParEmail !== null) {
      filtered = filtered.filter(client => 
        this.filtreCreeParEmail ? client.creeParEmail === true : client.creeParEmail !== true
      );
    }

    // Filtre nouveau contact
    if (this.filtreNouveauContact !== null) {
      filtered = filtered.filter(client => 
        this.filtreNouveauContact ? client.tagNouveauContact === true : client.tagNouveauContact !== true
      );
    }

    this.clientsFiltres = filtered;
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
    this.filtreStatut = 'tous';
    this.filtreCreeParEmail = null;
    this.filtreNouveauContact = null;
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
    const total = Math.ceil(this.clientsFiltres.length / this.pageSize);
    return total > 0 ? total : 1;
  }

  get paginationStart(): number {
    if (this.clientsFiltres.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.clientsFiltres.length);
  }

  viewClient(clientId: string): void {
    this.router.navigate(['/clients', clientId]);
  }

  getStatutClass(statut: string): string {
    return `statut-${statut}`;
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'actif': 'Actif',
      'inactif': 'Inactif',
      'prospect': 'Prospect'
    };
    return labels[statut] || statut;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getClientDisplayName(client: Client): string {
    if (client.prenom && client.nom) {
      return `${client.prenom} ${client.nom}`;
    }
    return client.nom || client.entreprise || 'Client sans nom';
  }

  navigateToCreateClient(): void {
    this.router.navigate(['/clients/create']);
  }

  deleteClient(client: Client): void {
    if (this.deletingClientId) {
      return;
    }

    const confirmed = window.confirm(`Supprimer le client "${this.getClientDisplayName(client)}" ?`);
    if (!confirmed) {
      return;
    }

    this.deletingClientId = client.id;
    this.clientService.deleteClientApi(client.id).subscribe({
      next: () => {
        this.clients = this.clients.filter((c) => c.id !== client.id);
        this.applyFilters();
        this.deletingClientId = null;
      },
      error: (error) => {
        this.deletingClientId = null;
        const message = this.extractDeleteErrorMessage(error);
        alert(message);
      },
    });
  }

  editClient(clientId: string): void {
    this.router.navigate(['/clients', clientId, 'edit']);
  }

  trackByClientId(index: number, client: Client): string {
    return client.id || `client-${index}`;
  }

  getPayloadStatus(client: Client): string {
    return client.status || client.statut;
  }

  private extractDeleteErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.status === 404 || error.status === 405) {
        return 'Suppression indisponible: endpoint non pris en charge par l API backend.';
      }
      if (error.status === 401 || error.status === 403) {
        return 'Suppression refusée: vous n avez pas les droits nécessaires.';
      }
      return `Suppression impossible (${error.status}): ${error.statusText || 'Erreur API'}`;
    }
    return 'Suppression impossible pour le moment.';
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
    this.clientsAffiches = this.clientsFiltres.slice(start, end);
  }
}
