/**
 * Modèle pour les emails reçus automatiquement
 * Selon CDC : Extraction automatique des informations de l'email
 */
export interface EmailSource {
  id: string;
  ticketId: string; // Lien vers le ticket créé
  from: string; // Adresse email expéditeur (From:)
  fromName?: string; // Nom d'affichage de l'expéditeur (si disponible)
  to: string; // satisfaction.mucrefci@ngser.com
  subject: string; // Objet du message (Subject:)
  body: string; // Corps du message
  dateReception: Date; // Date et heure d'envoi (Timestamp)
  cc?: string[]; // Adresses en copie (CC:)
  bcc?: string[]; // Adresses en copie cachée (BCC:)
  messageId?: string; // ID unique du message email
}
