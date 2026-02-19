export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  photo?: string;
  role: 'agent' | 'agent_senior' | 'superviseur' | 'admin' | 'stagiaire';
  statut: 'actif' | 'en_pause' | 'hors_ligne';
  dateEntree: Date;
  equipe?: string;
  competences?: string[];
  langues?: string[];
  specialites?: string[];
  bio?: string;
  preferences?: UserPreferences;
  statistiques?: UserStats;
}

export interface UserPreferences {
  langue: 'fr' | 'en';
  theme: 'clair' | 'sombre' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    widgets: string[];
    layout: string;
  };
}

export interface UserStats {
  ticketsTraites: number;
  ticketsEnCours: number;
  ticketsResolus: number;
  tempsMoyenReponse: number; // en minutes
  satisfactionMoyenne: number; // sur 5
  tauxResolution: number; // pourcentage
  slaRespecte: number; // pourcentage
  scoreGlobal: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
