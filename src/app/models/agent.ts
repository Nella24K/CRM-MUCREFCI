export interface Agent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo?: string;
  role: 'agent' | 'superviseur' | 'admin';
  statut: 'actif' | 'en_pause' | 'hors_ligne';
  dateEntree: Date;
  equipe?: string;
  competences?: string[];
  performance?: AgentPerformance;
}

export interface AgentPerformance {
  ticketsTraites: number;
  ticketsEnCours: number;
  tempsMoyenReponse: number; // en minutes
  satisfactionMoyenne: number; // sur 5
  tauxResolution: number; // pourcentage
  slaRespecte: number; // pourcentage
  score: number; // score calculé global
}

export interface TeamStats {
  agentsActifs: number;
  agentsEnPause: number;
  agentsHorsLigne: number;
  totalAgents: number;
  statutGlobal: 'operationnel' | 'surcharge' | 'critique';
  ticketsAssignes: number;
  ticketsEnCours: number;
  ticketsEnAttenteClient: number;
  ticketsEnRetard: number;
  capaciteRestante: number; // pourcentage
}

export interface Alerte {
  id: string;
  type: 'ticket_retard' | 'client_vip' | 'satisfaction_basse' | 'surcharge_agent' | 'sla_approche';
  priorite: 'haute' | 'moyenne' | 'basse';
  titre: string;
  message: string;
  ticketId?: string;
  agentId?: string;
  date: Date;
  actions?: AlerteAction[];
}

export interface AlerteAction {
  label: string;
  action: 'prendre_en_charge' | 'reassigner' | 'ignorer' | 'voir_details';
}
