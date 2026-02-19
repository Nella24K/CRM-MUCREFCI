/**
 * Modèle pour les pièces jointes
 * Selon CDC : Vérification types autorisés, taille max, scan antivirus, conversion
 */
export interface Attachment {
  id: string;
  ticketId: string;
  emailSourceId?: string; // Si venant d'un email
  nomFichier: string;
  typeMime: string; // ex: application/pdf, image/png, image/jpg
  extension: string; // .pdf, .jpg, .png, .doc, .xlsx
  taille: number; // en octets (max 10 Mo selon CDC)
  chemin: string; // Chemin de stockage
  scanne: boolean; // Si scan antivirus effectué
  scanResultat?: 'clean' | 'infected' | 'error'; // Résultat du scan
  converti?: boolean; // Si conversion effectuée (ex: .doc en .pdf)
  cheminConverti?: string; // Chemin du fichier converti si applicable
  dateUpload: Date;
}

// Types autorisés selon CDC
export const ATTACHMENT_TYPES_AUTORISES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

export const ATTACHMENT_EXTENSIONS_AUTORISES = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024; // 10 Mo en octets
