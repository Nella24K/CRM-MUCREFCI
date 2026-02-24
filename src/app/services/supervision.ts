import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Agent, AgentPerformance, TeamStats, Alerte } from '../models/agent';
import { UserService } from './user';
import { TicketService } from './ticket';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private apiUrl = 'api/supervision';

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private ticketService: TicketService
  ) {}

  /**
   * Récupère les statistiques de l'équipe
   */
  getTeamStats(): Observable<TeamStats> {
    // Plus tard: return this.http.get<TeamStats>(`${this.apiUrl}/team-stats`);
    
    // Simulation avec données mockées
    return of({
      agentsActifs: 5,
      agentsEnPause: 2,
      agentsHorsLigne: 1,
      totalAgents: 8,
      statutGlobal: 'operationnel',
      ticketsAssignes: 47,
      ticketsEnCours: 38,
      ticketsEnAttenteClient: 9,
      ticketsEnRetard: 3,
      capaciteRestante: 65
    });
  }

  /**
   * Récupère tous les agents avec leurs performances
   */
  getAgentsWithPerformance(): Observable<Agent[]> {
    // Plus tard: return this.http.get<Agent[]>(`${this.apiUrl}/agents`);
    // Pour l'instant, retourner les users transformés
    return this.userService.getUsers();
  }

  /**
   * Récupère les performances d'un agent
   */
  getAgentPerformance(agentId: string): Observable<AgentPerformance> {
    // Plus tard: return this.http.get<AgentPerformance>(`${this.apiUrl}/agents/${agentId}/performance`);
    
    // Simulation
    return of({
      ticketsTraites: 145,
      ticketsEnCours: 7,
      tempsMoyenReponse: 85, // minutes
      satisfactionMoyenne: 4.3,
      tauxResolution: 78,
      slaRespecte: 92,
      score: 87
    });
  }

  /**
   * Récupère les alertes nécessitant action
   */
  getAlertes(): Observable<Alerte[]> {
    // Plus tard: return this.http.get<Alerte[]>(`${this.apiUrl}/alertes`);
    
    // Simulation d'alertes
    return of([
      {
        id: '1',
        type: 'ticket_retard',
        priorite: 'haute',
        titre: 'Ticket en retard SLA',
        message: 'Ticket MUC-20240115-0421 en retard de 2h15',
        ticketId: 'MUC-20240115-0421',
        date: new Date(),
        actions: [
          { label: 'Prendre en charge', action: 'prendre_en_charge' },
          { label: 'Réassigner', action: 'reassigner' },
          { label: 'Voir détails', action: 'voir_details' }
        ]
      },
      {
        id: '2',
        type: 'client_vip',
        priorite: 'haute',
        titre: 'Client VIP - Réponse attendue',
        message: 'Client VIP - Réponse attendue dans 15min',
        ticketId: 'MUC-20240115-0422',
        date: new Date(),
        actions: [
          { label: 'Prendre en charge', action: 'prendre_en_charge' },
          { label: 'Réassigner', action: 'reassigner' }
        ]
      },
      {
        id: '3',
        type: 'satisfaction_basse',
        priorite: 'moyenne',
        titre: 'Satisfaction client faible',
        message: 'Satisfaction client < 2 - Ticket MUC-20240115-0387',
        ticketId: 'MUC-20240115-0387',
        date: new Date(),
        actions: [
          { label: 'Voir détails', action: 'voir_details' },
          { label: 'Réassigner', action: 'reassigner' }
        ]
      },
      {
        id: '4',
        type: 'surcharge_agent',
        priorite: 'moyenne',
        titre: 'Agent surchargé',
        message: 'Agent Marie KONÉ - 7 tickets consécutifs > 2h de traitement',
        agentId: '1',
        date: new Date(),
        actions: [
          { label: 'Rééquilibrer', action: 'reassigner' },
          { label: 'Voir détails', action: 'voir_details' }
        ]
      }
    ]);
  }

  /**
   * Réattribue un ticket à un autre agent
   */
  reassignTicket(ticketId: string, newAgentId: string, commentaire?: string): Observable<boolean> {
    // Plus tard: return this.http.post(`${this.apiUrl}/tickets/${ticketId}/reassign`, { newAgentId, commentaire });
    console.log(`Réattribution ticket ${ticketId} à agent ${newAgentId}`, commentaire);
    return of(true);
  }

  /**
   * Prend en charge un ticket (superviseur s'assigne le ticket)
   */
  takeOverTicket(ticketId: string): Observable<boolean> {
    // Plus tard: return this.http.post(`${this.apiUrl}/tickets/${ticketId}/takeover`, {});
    console.log(`Superviseur prend en charge ticket ${ticketId}`);
    return of(true);
  }

  /**
   * Ignore une alerte
   */
  ignoreAlerte(alerteId: string, motif?: string): Observable<boolean> {
    // Plus tard: return this.http.post(`${this.apiUrl}/alertes/${alerteId}/ignore`, { motif });
    console.log(`Alerte ${alerteId} ignorée`, motif);
    return of(true);
  }

  /**
   * Récupère les agents disponibles pour réattribution
   */
  getAvailableAgents(category?: string): Observable<User[]> {
    return this.userService.getUsers().pipe(
      // Filtrer les agents actifs et compétents pour la catégorie
      // Plus tard: return this.http.get<User[]>(`${this.apiUrl}/agents/available`, { params: { category } });
    );
  }
}
