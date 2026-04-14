export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  entreprise?: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  pays?: string;
  secteur?: string;
  statut: 'actif' | 'inactif' | 'prospect';
  dateCreation: Date;
  dateModification?: Date;
  notes?: string;
  
  // Champs pour clients créés automatiquement par email (selon CDC)
  creeParEmail?: boolean; // Si créé automatiquement lors de la réception d'un email
  tagNouveauContact?: boolean; // Tag automatique "Nouveau Contact"
  identifiantProspectTemporaire?: string; // Identifiant prospect temporaire
  domaineEmail?: string; // Domaine email (pour statistiques)
  datePremierContact?: Date; // Date du premier email reçu

  // Champs API création client
  tag?: string;
  matricule?: string;
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  lieu_naissance?: string;
  nationalite?: string;
  categorie_professionnelle?: string;
  status?: string;
  phone?: string;
  whatsapp?: string;
}
