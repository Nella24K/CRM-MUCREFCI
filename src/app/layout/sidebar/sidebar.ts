import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../services/ticket';
import { ClientService } from '../../services/client';
import { DashboardStats } from '../../models/ticket';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  @Input() collapsed: boolean = false;
  @Output() toggle = new EventEmitter<void>();

  stats: DashboardStats = {
    ticketsOuverts: 0,
    ticketsEnCours: 0,
    ticketsClotures: 0,
    nouveauxTickets: 0,
    ticketsEnAttente: 0,
    ticketsEnRetardSLA: 0,
    tempsMoyenTraitement: 0,
    tauxResolution: 0,
    tempsMoyenReponse: 0,
    satisfactionClient: 0,
    volumeEmail: 0,
    volumeWhatsApp: 0,
    nombreClients: 0
  };

  nombreClientsActifs: number = 0;
  isLoading: boolean = true;

  constructor(
    private ticketService: TicketService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    
    // Charger les statistiques des tickets
    this.ticketService.getDashboardStats().subscribe((stats: DashboardStats) => {
      this.stats = stats;
      this.isLoading = false;
    });

    // Charger le nombre de clients actifs
    this.clientService.getClients().subscribe((clients: any) => {
      this.nombreClientsActifs = clients.filter((c: any) => c.statut === 'actif').length;
    });
  }

  onToggle(): void {
    this.toggle.emit();
  }

  formatTemps(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${heures}h ${mins}min` : `${heures}h`;
  }
}
