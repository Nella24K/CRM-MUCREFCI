import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupervisionService } from '../services/supervision';
import { UserService } from '../services/user';
import { TicketService } from '../services/ticket';
import { Agent, TeamStats, Alerte } from '../models/agent';
import { User } from '../models/user';
import { Ticket } from '../models/ticket';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-supervision',
  imports: [CommonModule, FormsModule],
  templateUrl: './supervision.html',
  styleUrl: './supervision.css',
})
export class Supervision implements OnInit {
  readonly Math = Math;
  
  // Statistiques équipe
  teamStats: TeamStats | null = null;
  isLoading: boolean = true;

  // Agents
  agents: Agent[] = [];
  agentsFiltres: Agent[] = [];

  // Alertes
  alertes: Alerte[] = [];

  // Filtres
  filtreStatut: string = 'tous';
  filtreEquipe: string = 'toutes';

  // Modal réattribution
  showReassignModal: boolean = false;
  ticketToReassign: Ticket | null = null;
  availableAgents: User[] = [];
  selectedAgentId: string = '';
  reassignComment: string = '';
  isReassigning: boolean = false;

  // Modal agent detail
  showAgentDetail: boolean = false;
  selectedAgent: Agent | null = null;

  constructor(
    private supervisionService: SupervisionService,
    private userService: UserService,
    private ticketService: TicketService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Charger les stats équipe
    this.supervisionService.getTeamStats().subscribe({
      next: (stats) => {
        this.teamStats = stats;
      },
      error: (error) => {
        console.error('Erreur chargement stats équipe:', error);
      }
    });

    // Charger les agents
    this.userService.getUsers().subscribe({
      next: (users) => {
        // Transformer les Users en Agents avec performances
        this.agents = users.map(user => this.transformUserToAgent(user));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement agents:', error);
        this.isLoading = false;
      }
    });

    // Charger les alertes
    this.supervisionService.getAlertes().subscribe({
      next: (alertes) => {
        this.alertes = alertes;
      },
      error: (error) => {
        console.error('Erreur chargement alertes:', error);
      }
    });
  }

  transformUserToAgent(user: User): Agent {
    // Simuler des performances pour chaque agent
    const performance: any = {
      ticketsTraites: Math.floor(Math.random() * 200) + 50,
      ticketsEnCours: Math.floor(Math.random() * 10) + 1,
      tempsMoyenReponse: Math.floor(Math.random() * 120) + 30,
      satisfactionMoyenne: Math.random() * 2 + 3, // Entre 3 et 5
      tauxResolution: Math.floor(Math.random() * 30) + 70,
      slaRespecte: Math.floor(Math.random() * 20) + 80,
      score: Math.floor(Math.random() * 20) + 80
    };
    performance.score = Math.round(
      (performance.tauxResolution * 0.3 + 
       performance.slaRespecte * 0.3 + 
       performance.satisfactionMoyenne * 20 * 0.2 + 
       (200 - performance.tempsMoyenReponse) / 2 * 0.2)
    );

    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      photo: user.photo,
      role: user.role,
      statut: user.statut,
      dateEntree: user.dateEntree,
      equipe: user.equipe,
      competences: user.competences,
      performance: performance
    };
  }

  applyFilters(): void {
    let filtered = [...this.agents];

    if (this.filtreStatut !== 'tous') {
      filtered = filtered.filter(agent => agent.statut === this.filtreStatut);
    }

    if (this.filtreEquipe !== 'toutes') {
      filtered = filtered.filter(agent => agent.equipe === this.filtreEquipe);
    }

    this.agentsFiltres = filtered;
  }

  onFiltreChange(): void {
    this.applyFilters();
  }

  // Actions sur les alertes
  handleAlerteAction(alerte: Alerte, action: string): void {
    switch (action) {
      case 'prendre_en_charge':
        this.prendreEnCharge(alerte);
        break;
      case 'reassigner':
        this.reassigner(alerte);
        break;
      case 'voir_details':
        this.voirDetails(alerte);
        break;
      case 'ignorer':
        this.ignorer(alerte);
        break;
    }
  }

  prendreEnCharge(alerte: Alerte): void {
    if (alerte.ticketId) {
      this.supervisionService.takeOverTicket(alerte.ticketId).subscribe({
        next: () => {
          this.toastr.success('Ticket pris en charge', 'Succès');
          this.loadData();
        },
        error: () => {
          this.toastr.error('Erreur lors de la prise en charge', 'Erreur');
        }
      });
    }
  }

  reassigner(alerte: Alerte): void {
    if (alerte.ticketId) {
      // Charger le ticket et ouvrir le modal de réattribution
      this.ticketService.getTicketById(alerte.ticketId).subscribe({
        next: (ticket) => {
          this.ticketToReassign = ticket || null;
          if (this.ticketToReassign) {
            this.openReassignModal();
          }
        },
        error: () => {
          this.toastr.error('Erreur lors du chargement du ticket', 'Erreur');
        }
      });
    }
  }

  voirDetails(alerte: Alerte): void {
    if (alerte.ticketId) {
      this.router.navigate(['/tickets', alerte.ticketId]);
    } else if (alerte.agentId) {
      this.viewAgentDetail(alerte.agentId);
    }
  }

  ignorer(alerte: Alerte): void {
    const motif = prompt('Motif d\'ignorance (optionnel):');
    this.supervisionService.ignoreAlerte(alerte.id, motif || undefined).subscribe({
      next: () => {
        this.alertes = this.alertes.filter(a => a.id !== alerte.id);
        this.toastr.success('Alerte ignorée', 'Succès');
      },
      error: () => {
        this.toastr.error('Erreur lors de l\'ignorance', 'Erreur');
      }
    });
  }

  // Réattribution de ticket
  openReassignModal(): void {
    if (this.ticketToReassign) {
      this.supervisionService.getAvailableAgents(this.ticketToReassign.categorie).subscribe({
        next: (agents) => {
          // Exclure l'agent actuel
          this.availableAgents = agents.filter(a => 
            a.id !== this.ticketToReassign?.assigneA && 
            (a.role === 'agent' || a.role === 'agent_senior' || a.role === 'superviseur')
          );
          this.selectedAgentId = '';
          this.reassignComment = '';
          this.showReassignModal = true;
        },
        error: () => {
          this.toastr.error('Erreur lors du chargement des agents', 'Erreur');
        }
      });
    }
  }

  closeReassignModal(): void {
    this.showReassignModal = false;
    this.ticketToReassign = null;
    this.selectedAgentId = '';
    this.reassignComment = '';
  }

  confirmReassign(): void {
    if (!this.ticketToReassign || !this.selectedAgentId) {
      this.toastr.warning('Veuillez sélectionner un agent', 'Attention');
      return;
    }

    this.isReassigning = true;
    this.supervisionService.reassignTicket(
      this.ticketToReassign.id,
      this.selectedAgentId,
      this.reassignComment
    ).subscribe({
      next: () => {
        this.isReassigning = false;
        this.closeReassignModal();
        this.loadData();
        this.toastr.success('Ticket réassigné avec succès', 'Succès');
      },
      error: () => {
        this.isReassigning = false;
        this.toastr.error('Erreur lors de la réattribution', 'Erreur');
      }
    });
  }

  // Détail agent
  viewAgentDetail(agentId: string): void {
    const agent = this.agents.find(a => a.id === agentId);
    if (agent) {
      this.selectedAgent = agent;
      this.showAgentDetail = true;
    }
  }

  closeAgentDetail(): void {
    this.showAgentDetail = false;
    this.selectedAgent = null;
  }

  // Utilitaires
  getStatutClass(statut: string): string {
    return `statut-${statut}`;
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'actif': 'Actif',
      'en_pause': 'En pause',
      'hors_ligne': 'Hors ligne'
    };
    return labels[statut] || statut;
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'superviseur': 'Superviseur',
      'agent_senior': 'Agent Senior',
      'agent': 'Agent',
      'stagiaire': 'Stagiaire'
    };
    return labels[role] || role;
  }

  getAlerteTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'ticket_retard': 'Ticket en retard',
      'client_vip': 'Client VIP',
      'satisfaction_basse': 'Satisfaction faible',
      'surcharge_agent': 'Agent surchargé',
      'sla_approche': 'SLA approche'
    };
    return labels[type] || type;
  }

  getAlertePriorityClass(priorite: string): string {
    return `priority-${priorite}`;
  }

  formatTemps(minutes: number): string {
    if (!minutes || minutes === 0) return '0 min';
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const heures = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${heures}h ${mins}min` : `${heures}h`;
  }

  getUserDisplayName(agent: Agent): string {
    return `${agent.prenom} ${agent.nom}`;
  }
}
