import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../services/client';
import { Client } from '../models/client';

@Component({
  selector: 'app-clients',
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class Clients implements OnInit {
  clients: Client[] = [];
  clientsFiltres: Client[] = [];
  
  // Filtres
  recherche: string = '';
  filtreStatut: string = 'tous';
  filtreCreeParEmail: boolean | null = null; // null = tous, true = créés par email, false = autres
  filtreNouveauContact: boolean | null = null; // null = tous, true = avec tag "Nouveau Contact", false = sans tag

  // Options de filtres
  statuts = ['tous', 'actif', 'inactif', 'prospect'];

  // Modal création client
  showCreateModal: boolean = false;
  isCreating: boolean = false;
  newClient = {
    nom: '',
    prenom: '',
    entreprise: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    codePostal: '',
    pays: '',
    secteur: '',
    statut: 'prospect' as 'actif' | 'inactif' | 'prospect',
    notes: ''
  };

  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.applyFilters();
      },
      error: (error) => {
        // Afficher un message d'erreur à l'utilisateur
        alert('Erreur lors du chargement des clients. Veuillez réessayer.');
        // Réinitialiser les clients pour éviter les erreurs d'affichage
        this.clients = [];
        this.clientsFiltres = [];
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
        (client.prenom && client.prenom.toLowerCase().includes(searchLower)) ||
        client.email.toLowerCase().includes(searchLower) ||
        (client.entreprise && client.entreprise.toLowerCase().includes(searchLower))
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

  viewClient(clientId: string): void {
    // Navigation vers la page de détail du client (à créer si nécessaire)
    console.log('Voir client:', clientId);
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

  // Ouvrir le modal de création
  openCreateModal(): void {
    this.showCreateModal = true;
    // Réinitialiser le formulaire
    this.newClient = {
      nom: '',
      prenom: '',
      entreprise: '',
      email: '',
      telephone: '',
      adresse: '',
      ville: '',
      codePostal: '',
      pays: '',
      secteur: '',
      statut: 'prospect',
      notes: ''
    };
  }

  // Fermer le modal
  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  // Créer un nouveau client
  createClient(): void {
    // Validation
    if (!this.newClient.nom || !this.newClient.email) {
      alert('Veuillez remplir au moins le nom et l\'email du client.');
      return;
    }

    // Vérifier le format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newClient.email)) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }

    this.isCreating = true;

    this.clientService.createClient(this.newClient).subscribe({
      next: (client) => {
        this.isCreating = false;
        this.closeCreateModal();
        // Recharger la liste des clients
        this.loadClients();
        alert(`Client "${this.getClientDisplayName(client)}" créé avec succès !`);
      },
      error: (error) => {
        this.isCreating = false;
        alert('Erreur lors de la création du client. Veuillez réessayer.');
        console.error('Erreur création client:', error);
      }
    });
  }
}
