export interface EnqueteSatisfaction {
  id: string;
  ticketId: string;
  clientId: string;
  clientNom: string;
  agentId: string;
  agentNom: string;
  type: 'csat' | 'ces' | 'nps';
  statut: 'envoyee' | 'en_attente' | 'repondue' | 'expiree';
  dateEnvoi: Date;
  dateReponse?: Date;
  dateExpiration?: Date;
  canal: 'email' | 'whatsapp';
  reponse?: ReponseSatisfaction;
}

export interface ReponseSatisfaction {
  note: number; // 1-5 pour CSAT, 1-10 pour NPS
  commentaire?: string;
  date: Date;
}

export interface TemplateEnquete {
  id: string;
  nom: string;
  type: 'csat' | 'ces' | 'nps';
  description: string;
  questions: QuestionEnquete[];
  messageIntro: string;
  messageOutro: string;
  actif: boolean;
}

export interface QuestionEnquete {
  id: string;
  texte: string;
  type: 'note' | 'texte' | 'choix_multiple';
  options?: string[];
  obligatoire: boolean;
}

export interface StatistiquesSatisfaction {
  aujourdhui: {
    envoyees: number;
    reponses: number;
    tauxReponse: number;
    satisfactionMoyenne: number;
  };
  ceMois: {
    envoyees: number;
    reponses: number;
    tauxReponse: number;
    tendance: number; // pourcentage vs mois dernier
    meilleurAgent: string;
    meilleurAgentNote: number;
  };
  enAttente: {
    ticketsEligibles: number;
    ticketsPrioritaires: number;
    derniereEnquete: Date;
  };
}
