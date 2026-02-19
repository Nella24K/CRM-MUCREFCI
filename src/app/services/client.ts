import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Client } from '../models/client';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = 'api/clients'; // À remplacer par votre URL API réelle

  // Données mockées pour le développement
  private mockClients: Client[] = [
    {
      id: '1',
      nom: 'Dupont',
      prenom: 'Jean',
      entreprise: 'TechCorp',
      email: 'jean.dupont@techcorp.com',
      telephone: '+33 1 23 45 67 89',
      adresse: '123 Rue de la Tech',
      ville: 'Paris',
      codePostal: '75001',
      pays: 'France',
      secteur: 'Technologie',
      statut: 'actif',
      dateCreation: new Date('2024-01-15'),
      notes: 'Client important, très satisfait'
    },
    {
      id: '2',
      nom: 'Martin',
      prenom: 'Marie',
      entreprise: 'DesignStudio',
      email: 'marie.martin@designstudio.com',
      telephone: '+33 1 98 76 54 32',
      ville: 'Lyon',
      codePostal: '69001',
      pays: 'France',
      secteur: 'Design',
      statut: 'actif',
      dateCreation: new Date('2024-02-20')
    },
    {
      id: '3',
      nom: 'Bernard',
      prenom: 'Pierre',
      entreprise: 'ConsultPro',
      email: 'pierre.bernard@consultpro.com',
      telephone: '+33 1 11 22 33 44',
      ville: 'Marseille',
      codePostal: '13001',
      pays: 'France',
      secteur: 'Consulting',
      statut: 'prospect',
      dateCreation: new Date('2024-03-10')
    },
    {
      id: '4',
      nom: 'Dubois',
      prenom: 'Sophie',
      entreprise: 'MarketingPlus',
      email: 'sophie.dubois@marketingplus.com',
      telephone: '+33 1 55 66 77 88',
      ville: 'Toulouse',
      codePostal: '31000',
      pays: 'France',
      secteur: 'Marketing',
      statut: 'actif',
      dateCreation: new Date('2024-01-05')
    },
    {
      id: '5',
      nom: 'Leroy',
      prenom: 'Thomas',
      entreprise: 'FinanceExpert',
      email: 'thomas.leroy@financeexpert.com',
      telephone: '+33 1 44 55 66 77',
      ville: 'Bordeaux',
      codePostal: '33000',
      pays: 'France',
      secteur: 'Finance',
      statut: 'inactif',
      dateCreation: new Date('2023-12-01')
    }
  ];

  constructor(private http: HttpClient) {}

  // Récupérer tous les clients
  getClients(): Observable<Client[]> {
    // Pour l'instant, retourner les données mockées
    // Plus tard: return this.http.get<Client[]>(this.apiUrl);
    return of(this.mockClients);
  }

  // Récupérer un client par ID
  getClientById(id: string): Observable<Client | undefined> {
    // Plus tard: return this.http.get<Client>(`${this.apiUrl}/${id}`);
    const client = this.mockClients.find(c => c.id === id);
    return of(client);
  }

  // Créer un nouveau client
  createClient(client: Omit<Client, 'id' | 'dateCreation' | 'dateModification'>): Observable<Client> {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
      dateCreation: new Date(),
      statut: client.statut || 'prospect'
    };
    this.mockClients.push(newClient);
    // Plus tard: return this.http.post<Client>(this.apiUrl, client);
    return of(newClient);
  }

  // Mettre à jour un client
  updateClient(id: string, client: Partial<Client>): Observable<Client> {
    const index = this.mockClients.findIndex(c => c.id === id);
    if (index !== -1) {
      this.mockClients[index] = {
        ...this.mockClients[index],
        ...client,
        id,
        dateModification: new Date()
      };
      // Plus tard: return this.http.put<Client>(`${this.apiUrl}/${id}`, client);
      return of(this.mockClients[index]);
    }
    throw new Error('Client not found');
  }

  // Supprimer un client
  deleteClient(id: string): Observable<void> {
    const index = this.mockClients.findIndex(c => c.id === id);
    if (index !== -1) {
      this.mockClients.splice(index, 1);
      // Plus tard: return this.http.delete<void>(`${this.apiUrl}/${id}`);
      return of(undefined);
    }
    throw new Error('Client not found');
  }

  /**
   * Vérifie si un client existe par email
   */
  getClientByEmail(email: string): Observable<Client | undefined> {
    const client = this.mockClients.find(c => c.email.toLowerCase() === email.toLowerCase());
    return of(client);
  }

  /**
   * Crée automatiquement un profil "Prospect" à partir d'un email
   * Selon CDC : Lorsque l'adhérent n'existe pas, création automatique d'un profil "Prospect"
   */
  createProspectFromEmail(
    email: string,
    fromName?: string,
    domaineEmail?: string
  ): Observable<Client> {
    // Extraire le nom d'affichage si disponible
    let nom = 'Client';
    let prenom: string | undefined;
    
    if (fromName) {
      const nameParts = fromName.trim().split(/\s+/);
      if (nameParts.length > 1) {
        prenom = nameParts[0];
        nom = nameParts.slice(1).join(' ');
      } else {
        nom = fromName;
      }
    } else {
      // Extraire le nom depuis l'email si possible
      const emailParts = email.split('@')[0].split(/[._-]/);
      if (emailParts.length > 1) {
        prenom = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
        nom = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1);
      } else {
        nom = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
      }
    }

    // Extraire le domaine si non fourni
    if (!domaineEmail) {
      domaineEmail = email.split('@')[1];
    }

    // Générer un identifiant prospect temporaire
    const identifiantProspectTemporaire = `PROSP-${Date.now()}`;

    const newClient: Client = {
      id: Date.now().toString(),
      nom: nom,
      prenom: prenom,
      email: email,
      statut: 'prospect',
      dateCreation: new Date(),
      creeParEmail: true,
      tagNouveauContact: true,
      identifiantProspectTemporaire: identifiantProspectTemporaire,
      domaineEmail: domaineEmail,
      datePremierContact: new Date()
    };

    this.mockClients.push(newClient);
    return of(newClient);
  }

  /**
   * Retire le tag "Nouveau Contact" d'un client
   */
  removeNouveauContactTag(clientId: string): Observable<Client> {
    return this.updateClient(clientId, { tagNouveauContact: false });
  }
}
