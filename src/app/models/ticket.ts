import { EmailSource } from './email-source';
import { Attachment } from './attachment';

export interface Ticket {
  id: string;
  reference: string; // Format: MUC-YYYYMMDD-XXXX
  objet: string;
  clientId: string;
  clientNom: string;
  categorie: string;
  sousCategorie?: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  statut: 'nouveau' | 'en_cours' | 'en_attente_client' | 'en_attente' | 'resolu' | 'clos' | 'en_retard';
  canal: 'email' | 'whatsapp';
  assigneA?: string;
  assigneANom?: string;
  dateCreation: Date;
  datePremiereReponse?: Date;
  dateResolution?: Date;
  dateEcheanceSLA?: Date;
  tempsReponse?: number; // en minutes
  satisfaction?: number; // 1-5 ou 1-10
  tags?: string[];
  notesInternes?: string[];
  
  // Champs pour tickets créés par email (selon CDC)
  creeParEmail?: boolean; // Indique si créé automatiquement par email
  emailSource?: EmailSource; // Référence vers l'email source
  piecesJointes?: Attachment[]; // Liste des pièces jointes
}

export interface DashboardStats {
  // Tickets
  ticketsOuverts: number;
  ticketsEnCours: number;
  ticketsClotures: number;
  nouveauxTickets: number;
  ticketsEnAttente: number;
  ticketsEnRetardSLA: number;
  
  // Métriques
  tempsMoyenTraitement: number; // en minutes
  tauxResolution: number; // pourcentage
  tempsMoyenReponse: number; // en minutes
  satisfactionClient: number; // moyenne sur 5 ou 10
  
  // Messages
  volumeEmail: number;
  volumeWhatsApp: number;
  
  // Clients
  nombreClients: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}
