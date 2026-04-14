import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, from, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { Client } from '../models/client';
import { ApiService } from './api';

export interface CreateClientPayload {
  tag: string;
  matricule: string;
  firstname: string;
  lastname: string;
  birthdate: string;
  lieu_naissance: string;
  nationalite: string;
  categorie_professionnelle: string;
  status: string;
  email: string;
  phone: string;
  whatsapp: string;
  adresse: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly createClientPath = '/api/v1/clients';
  private readonly clientsCacheTtlMs = 30_000;
  private readonly clientsCacheStorageKey = 'clients_cache_v1';

  /** Client créé en dernier : fusionné au prochain chargement liste (GET peut être vide ou paginé). */
  private pendingCreatedClient: Client | null = null;
  private clientsCache: Client[] | null = null;
  private clientsCacheAt = 0;
  private clientsRequestInFlight: Observable<Client[]> | null = null;
  private hiddenDeletedClientIds = new Set<string>();

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

  constructor(private api: ApiService) {
    this.restoreCacheFromStorage();
  }

  getClientsSnapshot(): Client[] {
    if (this.clientsCache && this.clientsCache.length > 0) {
      return [...this.clientsCache];
    }
    this.restoreCacheFromStorage();
    return this.clientsCache ? [...this.clientsCache] : [];
  }

  // Récupérer tous les clients (API réelle)
  getClients(): Observable<Client[]> {
    const hasValidCache =
      this.clientsCache !== null && Date.now() - this.clientsCacheAt < this.clientsCacheTtlMs;
    if (hasValidCache) {
      return of([...this.clientsCache!]);
    }

    if (this.clientsRequestInFlight) {
      return this.clientsRequestInFlight;
    }

    const request$ = from(this.api.get<unknown>(this.createClientPath, { timeoutMs: 8000 })).pipe(
      map((response) => {
        const apiList = this.normalizeClientsResponse(response);
        const previousList =
          this.clientsCache && this.clientsCache.length > 0
            ? [...this.clientsCache]
            : [...this.restoreCacheFromStorage()];
        let list = this.mergeClientLists(previousList, apiList);
        list = this.mergePendingCreated(list);
        list = this.applyHiddenDeletedFilter(list);
        this.clientsCache = list;
        this.clientsCacheAt = Date.now();
        this.persistCacheToStorage(list);
        return [...list];
      }),
      catchError(() => {
        const persisted = this.restoreCacheFromStorage();
        let fallback = this.mergePendingCreated(
          this.clientsCache ? [...this.clientsCache] : [...persisted]
        );
        fallback = this.applyHiddenDeletedFilter(fallback);
        this.clientsCache = fallback;
        this.clientsCacheAt = Date.now();
        return of([...fallback]);
      }),
      finalize(() => {
        this.clientsRequestInFlight = null;
      }),
      shareReplay(1)
    );

    this.clientsRequestInFlight = request$;
    return request$;
  }

  private invalidateClientsCache(): void {
    this.clientsCache = null;
    this.clientsCacheAt = 0;
    this.clientsRequestInFlight = null;
    localStorage.removeItem(this.clientsCacheStorageKey);
  }

  private markClientsCacheStale(): void {
    // Conserve la liste affichée pour éviter de perdre les clients en UI,
    // mais force un refresh API au prochain getClients().
    this.clientsCacheAt = 0;
    this.clientsRequestInFlight = null;
  }

  private prependToClientsCache(client: Client): void {
    const current =
      this.clientsCache && this.clientsCache.length > 0
        ? [...this.clientsCache]
        : [...this.restoreCacheFromStorage()];
    const emailLower = client.email.toLowerCase();
    const duplicate = current.some(
      (c) =>
        (client.id && c.id && c.id === client.id) ||
        (emailLower && c.email.toLowerCase() === emailLower)
    );
    if (!duplicate) {
      this.clientsCache = [client, ...current];
      this.clientsCacheAt = Date.now();
      this.persistCacheToStorage(this.clientsCache);
    }
  }

  private persistCacheToStorage(list: Client[]): void {
    try {
      localStorage.setItem(this.clientsCacheStorageKey, JSON.stringify(list));
    } catch {
      // Ignore les erreurs de quota/storage navigateur.
    }
  }

  private restoreCacheFromStorage(): Client[] {
    try {
      const raw = localStorage.getItem(this.clientsCacheStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      const mapped = parsed.map((item) => this.mapApiItemToClient(item));
      if (mapped.length > 0) {
        this.clientsCache = mapped;
        this.clientsCacheAt = Date.now();
      }
      return mapped;
    } catch {
      return [];
    }
  }

  private applyHiddenDeletedFilter(list: Client[]): Client[] {
    if (this.hiddenDeletedClientIds.size === 0) {
      return list;
    }
    return list.filter((client) => !this.hiddenDeletedClientIds.has(client.id));
  }

  getCachedClientById(id: string): Client | null {
    const fromCache = this.clientsCache?.find((c) => c.id === id);
    if (fromCache) {
      return fromCache;
    }
    const fromMock = this.mockClients.find((c) => c.id === id);
    return fromMock || null;
  }

  /**
   * À appeler après POST /clients réussi : affiche le nouveau client tout de suite dans la liste.
   */
  registerClientAfterCreate(apiResponse: unknown, payload: CreateClientPayload): void {
    const fromResponse = this.tryMapCreatedResponse(apiResponse);
    if (fromResponse) {
      this.pendingCreatedClient = fromResponse;
      this.prependToClientsCache(fromResponse);
      return;
    }
    const localClient = this.clientFromCreatePayload(payload);
    this.pendingCreatedClient = localClient;
    this.prependToClientsCache(localClient);
  }

  private mergePendingCreated(list: Client[]): Client[] {
    if (!this.pendingCreatedClient) {
      return list;
    }
    const p = this.pendingCreatedClient;
    this.pendingCreatedClient = null;

    const emailLower = p.email.toLowerCase();
    const duplicate = list.some(
      (c) =>
        (p.id && c.id && c.id === p.id) ||
        (emailLower && c.email.toLowerCase() === emailLower)
    );
    if (duplicate) {
      return list;
    }
    return [p, ...list];
  }

  private mergeClientLists(previous: Client[], incoming: Client[]): Client[] {
    if (previous.length === 0) {
      return incoming;
    }
    if (incoming.length === 0) {
      return previous;
    }

    const merged = [...incoming];
    for (const oldClient of previous) {
      const oldEmail = (oldClient.email || '').toLowerCase();
      const exists = merged.some(
        (c) =>
          (oldClient.id && c.id && oldClient.id === c.id) ||
          (oldEmail && (c.email || '').toLowerCase() === oldEmail)
      );
      if (!exists) {
        merged.push(oldClient);
      }
    }
    return merged;
  }

  private tryMapCreatedResponse(res: unknown): Client | null {
    if (res == null || typeof res !== 'object') {
      return null;
    }
    const r = res as Record<string, unknown>;
    const inner = (r['data'] ?? r['client'] ?? r['payload']) as unknown;
    const toMap = inner && typeof inner === 'object' ? inner : res;
    const mapped = this.mapApiItemToClient(toMap);
    const okId = mapped.id && !mapped.id.startsWith('tmp-');
    const okEmail = mapped.email && mapped.email !== '—';
    if (okId || okEmail) {
      return mapped;
    }
    return null;
  }

  private clientFromCreatePayload(p: CreateClientPayload): Client {
    return {
      id: `local-${Date.now()}`,
      nom: p.lastname || p.firstname,
      prenom: p.lastname ? p.firstname : undefined,
      tag: p.tag,
      matricule: p.matricule,
      firstname: p.firstname,
      lastname: p.lastname,
      birthdate: p.birthdate,
      lieu_naissance: p.lieu_naissance,
      nationalite: p.nationalite,
      categorie_professionnelle: p.categorie_professionnelle,
      status: p.status,
      email: p.email,
      phone: p.phone || undefined,
      telephone: p.phone || undefined,
      whatsapp: p.whatsapp || undefined,
      adresse: p.adresse || undefined,
      statut: this.normalizeStatut(p.status),
      dateCreation: new Date(),
    };
  }

  private normalizeClientsResponse(response: unknown): Client[] {
    const list = this.extractClientArray(response);
    return list.map((item) => this.mapApiItemToClient(item));
  }

  private extractClientArray(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const keys = ['data', 'items', 'clients', 'content', 'results', 'records', 'value', 'rows'];
      for (const k of keys) {
        const v = r[k];
        if (Array.isArray(v)) {
          return v;
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const nested = this.extractClientArray(v);
          if (nested.length > 0) {
            return nested;
          }
        }
      }
    }
    return [];
  }

  private mapApiItemToClient(item: unknown): Client {
    const raw = item as Record<string, unknown>;
    const id = String(raw['id'] ?? raw['uuid'] ?? '');
    const firstname = String(raw['firstname'] ?? raw['prenom'] ?? '');
    const lastname = String(raw['lastname'] ?? raw['nom'] ?? '');
    const email = String(raw['email'] ?? '');
    const statut = this.normalizeStatut(raw['status'] ?? raw['statut']);
    const dateCreation = this.parseDate(
      raw['dateCreation'] ?? raw['created_at'] ?? raw['createdAt'] ?? raw['date_creation']
    );

    return {
      id: id || `tmp-${Math.random().toString(36).slice(2)}`,
      nom: lastname || firstname || '—',
      prenom: lastname ? firstname || undefined : undefined,
      firstname: firstname || undefined,
      lastname: lastname || undefined,
      tag: raw['tag'] != null ? String(raw['tag']) : undefined,
      matricule: raw['matricule'] != null ? String(raw['matricule']) : undefined,
      birthdate: raw['birthdate'] != null ? String(raw['birthdate']) : undefined,
      lieu_naissance: raw['lieu_naissance'] != null ? String(raw['lieu_naissance']) : undefined,
      nationalite: raw['nationalite'] != null ? String(raw['nationalite']) : undefined,
      categorie_professionnelle:
        raw['categorie_professionnelle'] != null ? String(raw['categorie_professionnelle']) : undefined,
      status: raw['status'] != null ? String(raw['status']) : undefined,
      entreprise: raw['entreprise'] != null ? String(raw['entreprise']) : undefined,
      email: email || '—',
      phone: raw['phone'] != null ? String(raw['phone']) : undefined,
      telephone: raw['phone'] != null ? String(raw['phone']) : raw['telephone'] != null ? String(raw['telephone']) : undefined,
      whatsapp: raw['whatsapp'] != null ? String(raw['whatsapp']) : undefined,
      adresse: raw['adresse'] != null ? String(raw['adresse']) : undefined,
      ville: raw['ville'] != null ? String(raw['ville']) : undefined,
      codePostal: raw['codePostal'] != null ? String(raw['codePostal']) : undefined,
      pays: raw['pays'] != null ? String(raw['pays']) : undefined,
      secteur: raw['secteur'] != null ? String(raw['secteur']) : undefined,
      statut,
      dateCreation,
    };
  }

  private normalizeStatut(value: unknown): Client['statut'] {
    const s = String(value ?? 'prospect').toLowerCase();
    if (s === 'actif' || s === 'inactif' || s === 'prospect') {
      return s;
    }
    return 'prospect';
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }
    return new Date();
  }

  // Récupérer un client par ID
  getClientById(id: string): Observable<Client | undefined> {
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

  createClientApi(payload: CreateClientPayload): Observable<unknown> {
    return from(this.api.post<unknown>(this.createClientPath, payload)).pipe(
      tap(() => this.markClientsCacheStale())
    );
  }

  getClientByIdApi(id: string): Observable<Client> {
    return from(this.api.get<unknown>(`${this.createClientPath}/${id}`)).pipe(
      map((response) => this.mapSingleClientResponse(response))
    );
  }

  updateClientApi(id: string, payload: CreateClientPayload): Observable<Client> {
    return from(this.api.put<unknown>(`${this.createClientPath}/${id}`, payload)).pipe(
      map((response) => this.mapSingleClientResponse(response)),
      tap(() => this.invalidateClientsCache())
    );
  }

  deleteClientApi(id: string): Observable<void> {
    // Le backend n'expose pas DELETE /clients/{id}. On effectue une suppression logique.
    return this.getClientByIdApi(id).pipe(
      switchMap((client) => {
        const payload: CreateClientPayload = {
          tag: client.tag || '',
          matricule: client.matricule || '',
          firstname: client.firstname || client.prenom || '',
          lastname: client.lastname || client.nom || '',
          birthdate: client.birthdate || '',
          lieu_naissance: client.lieu_naissance || '',
          nationalite: client.nationalite || '',
          categorie_professionnelle: client.categorie_professionnelle || '',
          status: 'inactif',
          email: client.email || '',
          phone: client.phone || client.telephone || '',
          whatsapp: client.whatsapp || '',
          adresse: client.adresse || '',
        };
        return from(this.api.put<unknown>(`${this.createClientPath}/${id}`, payload)).pipe(
          map(() => void 0)
        );
      }),
      tap(() => {
        this.hiddenDeletedClientIds.add(id);
        this.clientsCache = this.clientsCache?.filter((c) => c.id !== id) || null;
        this.invalidateClientsCache();
      })
    );
  }

  private mapSingleClientResponse(response: unknown): Client {
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const inner = (r['data'] ?? r['client'] ?? r['payload']) as unknown;
      if (inner && typeof inner === 'object') {
        return this.mapApiItemToClient(inner);
      }
    }
    return this.mapApiItemToClient(response);
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
