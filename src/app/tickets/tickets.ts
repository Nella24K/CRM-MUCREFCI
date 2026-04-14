import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../services/ticket';
import { Ticket } from '../models/ticket';

@Component({
  selector: 'app-tickets',
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.html',
  styleUrl: './tickets.css',
})
export class Tickets implements OnInit {
  tickets: Ticket[] = [];
  ticketsFiltres: Ticket[] = [];
  
  // Filtres
  recherche: string = '';
  filtreStatut: string = 'tous';
  filtrePriorite: string = 'toutes';
  filtreCanal: string = 'tous';
  filtreCreeParEmail: boolean | null = null; // null = tous, true = créés par email, false = autres

  // Options de filtres
  statuts = ['tous', 'nouveau', 'en_cours', 'en_attente', 'en_attente_client', 'resolu', 'clos', 'en_retard'];
  priorites = ['toutes', 'basse', 'normale', 'haute', 'urgente'];
  canaux = ['tous', 'email', 'whatsapp'];

  constructor(
    private ticketService: TicketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.applyFilters();
      },
      error: (error) => {
        // Afficher un message d'erreur à l'utilisateur
        alert('Erreur lors du chargement des tickets. Veuillez réessayer.');
        // Réinitialiser les tickets pour éviter les erreurs d'affichage
        this.tickets = [];
        this.ticketsFiltres = [];
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tickets];

    // Recherche
    if (this.recherche.trim()) {
      const searchLower = this.recherche.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.reference.toLowerCase().includes(searchLower) ||
        ticket.objet.toLowerCase().includes(searchLower) ||
        ticket.clientNom.toLowerCase().includes(searchLower)
      );
    }

    // Filtre statut
    if (this.filtreStatut !== 'tous') {
      filtered = filtered.filter(ticket => ticket.statut === this.filtreStatut);
    }

    // Filtre priorité
    if (this.filtrePriorite !== 'toutes') {
      filtered = filtered.filter(ticket => ticket.priorite === this.filtrePriorite);
    }

    // Filtre canal
    if (this.filtreCanal !== 'tous') {
      filtered = filtered.filter(ticket => ticket.canal === this.filtreCanal);
    }

    // Filtre créé par email
    if (this.filtreCreeParEmail !== null) {
      filtered = filtered.filter(ticket => 
        this.filtreCreeParEmail ? ticket.creeParEmail === true : ticket.creeParEmail !== true
      );
    }

    this.ticketsFiltres = filtered;
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
    this.filtrePriorite = 'toutes';
    this.filtreCanal = 'tous';
    this.filtreCreeParEmail = null;
    this.applyFilters();
  }

  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  getStatusClass(statut: string): string {
    return `status-${statut}`;
  }

  getPriorityClass(priorite: string): string {
    return `priority-${priorite}`;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'en_attente_client': 'En attente client',
      'resolu': 'Résolu',
      'clos': 'Clos',
      'en_retard': 'En retard'
    };
    return labels[statut] || statut;
  }

  getPrioriteLabel(priorite: string): string {
    const labels: { [key: string]: string } = {
      'basse': 'Basse',
      'normale': 'Normale',
      'haute': 'Haute',
      'urgente': 'Urgente'
    };
    return labels[priorite] || priorite;
  }

  trackByTicketId(index: number, ticket: Ticket): string {
    return ticket.id || `ticket-${index}`;
  }
}
