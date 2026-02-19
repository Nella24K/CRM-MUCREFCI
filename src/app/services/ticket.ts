import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Ticket, DashboardStats, ChartData } from '../models/ticket';
import { EmailSource } from '../models/email-source';
import { Attachment } from '../models/attachment';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private mockTickets: Ticket[] = [
    {
      id: '1',
      reference: 'MUC-20250115-0001',
      objet: 'Erreur sur ma facture de janvier 2025',
      clientId: '1',
      clientNom: 'Jean Dupont',
      categorie: 'Réclamation',
      sousCategorie: 'Erreur de facturation',
      priorite: 'normale',
      statut: 'en_cours',
      canal: 'email',
      assigneA: 'agent1',
      assigneANom: 'Marie KONÉ',
      dateCreation: new Date('2025-01-15T09:30:00'),
      datePremiereReponse: new Date('2025-01-15T10:15:00'),
      dateEcheanceSLA: new Date('2025-01-15T17:30:00'),
      tempsReponse: 45,
      satisfaction: 4
    },
    {
      id: '2',
      reference: 'MUC-20250115-0002',
      objet: 'Demande d\'information sur les services',
      clientId: '2',
      clientNom: 'Marie Martin',
      categorie: 'Demande d\'Information',
      priorite: 'basse',
      statut: 'nouveau',
      canal: 'whatsapp',
      dateCreation: new Date('2025-01-15T10:00:00'),
      dateEcheanceSLA: new Date('2025-01-15T18:00:00')
    },
    {
      id: '3',
      reference: 'MUC-20250115-0003',
      objet: 'Problème de connexion à mon compte',
      clientId: '3',
      clientNom: 'Pierre Bernard',
      categorie: 'Assistance Technique',
      priorite: 'haute',
      statut: 'en_attente',
      canal: 'email',
      dateCreation: new Date('2025-01-14T14:00:00'),
      dateEcheanceSLA: new Date('2025-01-14T18:00:00')
    },
    {
      id: '4',
      reference: 'MUC-20250114-0025',
      objet: 'Question sur mon abonnement',
      clientId: '4',
      clientNom: 'Sophie Dubois',
      categorie: 'Demande d\'Information',
      priorite: 'normale',
      statut: 'resolu',
      canal: 'whatsapp',
      assigneA: 'agent2',
      assigneANom: 'Jean KOUASSI',
      dateCreation: new Date('2025-01-14T11:00:00'),
      datePremiereReponse: new Date('2025-01-14T11:30:00'),
      dateResolution: new Date('2025-01-14T15:00:00'),
      tempsReponse: 30,
      satisfaction: 5
    },
    {
      id: '5',
      reference: 'MUC-20250113-0018',
      objet: 'Réclamation service client',
      clientId: '5',
      clientNom: 'Thomas Leroy',
      categorie: 'Réclamation',
      priorite: 'urgente',
      statut: 'en_retard',
      canal: 'email',
      assigneA: 'agent1',
      assigneANom: 'Marie KONÉ',
      dateCreation: new Date('2025-01-13T09:00:00'),
      dateEcheanceSLA: new Date('2025-01-13T17:00:00')
    },
  ];

  getTickets(): Observable<Ticket[]> {
    return of(this.mockTickets);
  }

  getTicketById(id: string): Observable<Ticket | undefined> {
    const ticket = this.mockTickets.find(t => t.id === id);
    return of(ticket);
  }

  createTicket(ticket: Omit<Ticket, 'id'>): Observable<Ticket> {
    const newTicket: Ticket = {
      ...ticket,
      id: Date.now().toString()
    };
    this.mockTickets.unshift(newTicket); // Ajouter au début
    return of(newTicket);
  }

  updateTicket(id: string, updates: Partial<Ticket>): Observable<Ticket> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTickets[index] = {
        ...this.mockTickets[index],
        ...updates
      };
      return of(this.mockTickets[index]);
    }
    throw new Error('Ticket not found');
  }

  deleteTicket(id: string): Observable<boolean> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTickets.splice(index, 1);
      return of(true);
    }
    return of(false);
  }

  // Logique d'assignation automatique selon le CDC
  assignTicketAutomatically(existingTickets: Ticket[]): { agentId: string; agentNom: string } | { agentId: ''; agentNom: '' } {
    const agents = [
      { id: 'agent1', nom: 'Marie KONÉ' },
      { id: 'agent2', nom: 'Jean KOUASSI' }
    ];

    // Compter les tickets en cours par agent
    const ticketCounts: { [key: string]: number } = {};
    agents.forEach(agent => {
      ticketCounts[agent.id] = existingTickets.filter(t => 
        t.assigneA === agent.id && 
        (t.statut === 'nouveau' || t.statut === 'en_cours' || t.statut === 'en_attente')
      ).length;
    });

    // Trouver l'agent avec le moins de tickets (round-robin par charge de travail)
    let minCount = Infinity;
    let selectedAgent = agents[0];

    agents.forEach(agent => {
      if (ticketCounts[agent.id] < minCount) {
        minCount = ticketCounts[agent.id];
        selectedAgent = agent;
      }
    });

    // Si tous les agents ont la même charge, utiliser le round-robin simple
    if (minCount === ticketCounts[agents[0].id] && minCount === ticketCounts[agents[1].id]) {
      // Round-robin : alterner entre les agents
      const lastAssigned = existingTickets
        .filter(t => t.assigneA)
        .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())[0];
      
      if (lastAssigned && lastAssigned.assigneA) {
        const lastIndex = agents.findIndex(a => a.id === lastAssigned.assigneA);
        const nextIndex = (lastIndex + 1) % agents.length;
        selectedAgent = agents[nextIndex];
      }
    }

    return {
      agentId: selectedAgent.id,
      agentNom: selectedAgent.nom
    };
  }

  getDashboardStats(filters?: {
    periode?: 'jour' | 'semaine' | 'mois' | 'personnalise';
    agent?: string;
    canal?: string;
    statut?: string;
    dateDebut?: Date;
    dateFin?: Date;
  }): Observable<DashboardStats> {
    // Simulation des calculs
    const tickets = this.mockTickets;
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    const ticketsOuverts = tickets.filter(t => 
      t.statut === 'nouveau' || t.statut === 'en_cours' || t.statut === 'en_attente_client' || t.statut === 'en_attente'
    ).length;

    const nouveauxTickets = tickets.filter(t => {
      const dateCreation = new Date(t.dateCreation);
      dateCreation.setHours(0, 0, 0, 0);
      return dateCreation.getTime() === aujourdhui.getTime();
    }).length;

    const ticketsEnAttente = tickets.filter(t => !t.assigneA).length;

    const ticketsEnRetardSLA = tickets.filter(t => {
      if (!t.dateEcheanceSLA) return false;
      return new Date() > new Date(t.dateEcheanceSLA) && 
             (t.statut === 'nouveau' || t.statut === 'en_cours' || t.statut === 'en_attente');
    }).length;

    const ticketsResolus = tickets.filter(t => t.statut === 'resolu' || t.statut === 'clos');
    const ticketsResolusDansDelais = ticketsResolus.filter(t => {
      if (!t.dateEcheanceSLA || !t.dateResolution) return false;
      return new Date(t.dateResolution) <= new Date(t.dateEcheanceSLA);
    });
    const tauxResolution = ticketsResolus.length > 0 
      ? Math.round((ticketsResolusDansDelais.length / ticketsResolus.length) * 100)
      : 0;

    const ticketsAvecReponse = tickets.filter(t => t.tempsReponse);
    const tempsMoyenReponse = ticketsAvecReponse.length > 0
      ? Math.round(ticketsAvecReponse.reduce((sum, t) => sum + (t.tempsReponse || 0), 0) / ticketsAvecReponse.length)
      : 0;

    const ticketsAvecSatisfaction = tickets.filter(t => t.satisfaction);
    const satisfactionClient = ticketsAvecSatisfaction.length > 0
      ? Number((ticketsAvecSatisfaction.reduce((sum, t) => sum + (t.satisfaction || 0), 0) / ticketsAvecSatisfaction.length).toFixed(1))
      : 0;

    // Calculs supplémentaires selon CDC
    const ticketsEnCours = tickets.filter(t => t.statut === 'en_cours').length;
    const ticketsClotures = tickets.filter(t => t.statut === 'resolu' || t.statut === 'clos').length;
    
    // Temps moyen de traitement (de création à résolution)
    const ticketsTraites = tickets.filter(t => t.dateResolution && t.dateCreation);
    const tempsMoyenTraitement = ticketsTraites.length > 0
      ? Math.round(ticketsTraites.reduce((sum, t) => {
          const duree = (new Date(t.dateResolution!).getTime() - new Date(t.dateCreation).getTime()) / (1000 * 60);
          return sum + duree;
        }, 0) / ticketsTraites.length)
      : 0;
    
    // Volume de messages par canal
    const volumeEmail = tickets.filter(t => t.canal === 'email').length;
    const volumeWhatsApp = tickets.filter(t => t.canal === 'whatsapp').length;

    return of({
      ticketsOuverts,
      ticketsEnCours,
      ticketsClotures,
      nouveauxTickets,
      ticketsEnAttente,
      ticketsEnRetardSLA,
      tempsMoyenTraitement,
      tauxResolution,
      tempsMoyenReponse,
      satisfactionClient,
      volumeEmail,
      volumeWhatsApp,
      nombreClients: 248 // Mock
    });
  }

  getChartData(type: 'jour' | 'semaine' | 'mois'): Observable<ChartData> {
    // Données mockées pour les graphiques
    let labels: string[] = [];
    let data: number[] = [];

    if (type === 'jour') {
      labels = ['00h', '04h', '08h', '12h', '16h', '20h'];
      data = [12, 19, 15, 25, 22, 18];
    } else if (type === 'semaine') {
      labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      data = [85, 92, 78, 95, 88, 82, 90];
    } else {
      labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      data = [320, 350, 380, 340];
    }

    return of({
      labels,
      datasets: [{
        label: 'Tickets',
        data,
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderColor: '#2563eb',
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    });
  }

  exportToExcel(): void {
    // Simulation d'export Excel
    console.log('Export Excel en cours...');
    // Ici, vous utiliserez une bibliothèque comme xlsx pour l'export réel
  }

  /**
   * Génère une référence de ticket au format MUC-YYYYMMDD-XXXX
   * Selon CDC ligne 30 : Format MUC-YYYYMMDD-XXXX (ex: MUC-20240115-0421)
   */
  generateTicketReference(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Compter les tickets du jour
    const ticketsToday = this.mockTickets.filter(t => {
      const ticketDate = new Date(t.dateCreation);
      return ticketDate.getFullYear() === year &&
             ticketDate.getMonth() === today.getMonth() &&
             ticketDate.getDate() === today.getDate();
    });

    const sequence = String(ticketsToday.length + 1).padStart(4, '0');
    return `MUC-${dateStr}-${sequence}`;
  }

  /**
   * Crée automatiquement un ticket à partir d'un email
   * Selon CDC : Création automatique du ticket avec génération de référence
   */
  createTicketFromEmail(
    emailSource: EmailSource,
    clientId: string,
    clientNom: string,
    attachments?: Attachment[]
  ): Observable<Ticket> {
    const reference = this.generateTicketReference();
    const now = new Date();

    const newTicket: Ticket = {
      id: Date.now().toString(),
      reference: reference,
      objet: emailSource.subject,
      clientId: clientId,
      clientNom: clientNom,
      categorie: 'Demande', // À déterminer selon l'objet ou le contenu
      priorite: 'normale',
      statut: 'nouveau',
      canal: 'email',
      dateCreation: now,
      dateEcheanceSLA: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 heures après
      creeParEmail: true,
      emailSource: emailSource,
      piecesJointes: attachments || []
    };

    // Assignation automatique
    const assignment = this.assignTicketAutomatically(this.mockTickets);
    if (assignment.agentId) {
      newTicket.assigneA = assignment.agentId;
      newTicket.assigneANom = assignment.agentNom;
    }

    this.mockTickets.unshift(newTicket);
    return of(newTicket);
  }

  /**
   * Télécharge une pièce jointe
   */
  downloadAttachment(attachmentId: string): Observable<Blob> {
    // Simulation - à remplacer par un appel API réel
    console.log('Téléchargement de la pièce jointe:', attachmentId);
    return of(new Blob());
  }
}
