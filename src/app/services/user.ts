import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { User } from '../models/user';
import { ApiError, ApiService } from './api';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly usersPath = '/api/v1/users';
  private readonly rolesPath = '/api/v1/role';
  private readonly usersCacheStorageKey = 'users_cache_v1';
  private usersCache: User[] = [];

  constructor(private api: ApiService) {
    this.usersCache = this.restoreUsersCache();
  }

  /**
   * Récupère tous les utilisateurs
   */
  getUsers(): Observable<User[]> {
    return from(this.getUsersRequest()).pipe(
      map((response) => this.mapUsersResponse(response))
    );
  }

  getUsersSnapshot(): User[] {
    if (this.usersCache.length > 0) {
      return [...this.usersCache];
    }
    this.usersCache = this.restoreUsersCache();
    return [...this.usersCache];
  }

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: string): Observable<User | undefined> {
    return from(this.api.get<unknown>(`${this.usersPath}/${id}`)).pipe(
      map((response) => this.mapSingleUserResponse(response))
    );
  }

  /**
   * Récupère un utilisateur par son email
   */
  getUserByEmail(email: string): Observable<User | undefined> {
    return this.getUsers().pipe(
      map((users) => users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
    );
  }

  /**
   * Crée un nouvel utilisateur
   */
  createUser(user: Omit<User, 'id' | 'dateEntree'>): Observable<User> {
    const payload = {
      email: user.email,
      role: user.role,
    };
    return from(this.createUserRequest(payload)).pipe(
      map((response) => {
        const mapped = this.mapSingleUserResponse(response);
        const createdUser =
          mapped.id || mapped.email
            ? mapped
            : this.buildFallbackCreatedUser(payload.email, payload.role);
        this.upsertUserInCache(createdUser);
        return createdUser;
      })
    );
  }

  /**
   * Met à jour un utilisateur
   */
  updateUser(id: string, user: Partial<User>): Observable<User> {
    return from(this.api.put<unknown>(`${this.usersPath}/${id}`, user)).pipe(
      map((response) => this.mapSingleUserResponse(response))
    );
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(id: string): Observable<void> {
    // Endpoint demandé: /api/v1/users/{userId}
    return from(this.api.delete<void>(`${this.usersPath}/${id}`));
  }

  updatePassword(userId: string, newPassword: string): Observable<void> {
    return from(this.api.put<void>(`${this.usersPath}/update-password/${userId}`, { newPassword }));
  }

  softDeleteUser(userId: string): Observable<void> {
    return from(this.api.put<void>(`${this.usersPath}/soft-delete/${userId}`, {}));
  }

  private async createUserRequest(payload: { email: string; role: User['role'] }): Promise<unknown> {
    const payloadCandidates = await this.buildCreateUserPayloadCandidates(payload.email, payload.role);
    let lastError: unknown;

    for (const candidate of payloadCandidates) {
      try {
        return await this.api.post<unknown>(this.usersPath, candidate, { responseType: 'none' });
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError && error.status !== 401 && error.status !== 403) {
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  private async buildCreateUserPayloadCandidates(
    email: string,
    role: User['role']
  ): Promise<Array<Record<string, unknown>>> {
    const candidates: Array<Record<string, unknown>> = [];
    const dynamicCandidates = await this.getRoleCandidatesFromApi(role);
    const roleCandidates = [...dynamicCandidates, ...this.getRoleCandidatesForApi(role)];
    for (const roleCandidate of roleCandidates) {
      candidates.push({ email, role: roleCandidate });
      candidates.push({ email, profil: roleCandidate });
      candidates.push({ email, authority: roleCandidate });
      candidates.push({ email, userRole: roleCandidate });
    }

    return this.deduplicatePayloadCandidates(candidates);
  }

  private async getUsersRequest(): Promise<unknown> {
    try {
      return await this.api.get<unknown>(this.usersPath);
    } catch (error) {
      // Certains backends exposent seulement la route avec slash final.
      if (error instanceof ApiError && error.status === 404) {
        return this.api.get<unknown>(`${this.usersPath}/`);
      }
      throw error;
    }
  }

  private getRoleCandidatesForApi(role: User['role']): string[] {
    if (role === 'admin') {
      return ['ADMIN', 'ADMINISTRATEUR', 'ROLE_ADMIN', 'ADMINISTRATOR'];
    }
    if (role === 'superviseur') {
      return ['SUPERVISEUR', 'SUPERVISOR', 'ROLE_SUPERVISEUR', 'ROLE_SUPERVISOR'];
    }
    // Pour "agent" côté UI, l'API semble attendre "USER" et non "AGENT".
    return ['USER', 'UTILISATEUR', 'ROLE_USER', 'user'];
  }

  private async getRoleCandidatesFromApi(role: User['role']): Promise<string[]> {
    try {
      const response = await this.api.get<unknown>(this.rolesPath);
      const entries = this.extractRoleEntries(response);
      const filtered = entries.filter((entry) => this.roleEntryMatches(entry, role));

      const codes = filtered
        .map((entry) => this.asNonEmptyString(entry['code']))
        .filter((value) => value.length > 0);
      const labels = filtered
        .map((entry) => this.asNonEmptyString(entry['label']))
        .filter((value) => value.length > 0);

      return [...codes, ...labels];
    } catch {
      return [];
    }
  }

  private extractRoleEntries(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (payload && typeof payload === 'object') {
      const data = (payload as Record<string, unknown>)['data'];
      if (Array.isArray(data)) {
        return data.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    return [];
  }

  private roleEntryMatches(entry: Record<string, unknown>, role: User['role']): boolean {
    const code = this.asNonEmptyString(entry['code']).toLowerCase();
    const label = this.asNonEmptyString(entry['label']).toLowerCase();
    const level = this.asNonEmptyString(entry['niveau']).toLowerCase();
    const text = `${code} ${label} ${level}`;

    if (role === 'admin') {
      return text.includes('admin');
    }
    if (role === 'superviseur') {
      return text.includes('supervis') || code === 'sup';
    }

    return text.includes('agent') || code.startsWith('agt');
  }

  private asNonEmptyString(value: unknown): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }

  private deduplicatePayloadCandidates(
    payloads: Array<Record<string, unknown>>
  ): Array<Record<string, unknown>> {
    const seen = new Set<string>();
    const unique: Array<Record<string, unknown>> = [];
    for (const payload of payloads) {
      const key = JSON.stringify(payload);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(payload);
    }
    return unique;
  }

  /**
   * Désactive un utilisateur (change son statut)
   */
  deactivateUser(id: string): Observable<User> {
    return this.updateUser(id, { statut: 'hors_ligne' });
  }

  /**
   * Active un utilisateur
   */
  activateUser(id: string): Observable<User> {
    return this.updateUser(id, { statut: 'actif' });
  }

  /**
   * Récupère les utilisateurs par rôle
   */
  getUsersByRole(role: User['role']): Observable<User[]> {
    return this.getUsers().pipe(map((users) => users.filter((u) => u.role === role)));
  }

  /**
   * Récupère les utilisateurs par équipe
   */
  getUsersByEquipe(equipe: string): Observable<User[]> {
    return this.getUsers().pipe(map((users) => users.filter((u) => u.equipe === equipe)));
  }

  /**
   * Vérifie si un email est déjà utilisé
   */
  isEmailTaken(email: string, excludeUserId?: string): Observable<boolean> {
    return this.getUsers().pipe(
      map((users) =>
        users.some(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            (!excludeUserId || u.id !== excludeUserId)
        )
      )
    );
  }

  private mapUsersResponse(response: unknown): User[] {
    const list = this.extractUserArray(response);
    const mapped = list
      .map((item) => this.mapApiUser(item))
      .filter((user) => Boolean(user.email || user.id));
    if (mapped.length > 0) {
      this.usersCache = mapped;
      this.persistUsersCache(mapped);
    }
    return mapped;
  }

  private mapSingleUserResponse(response: unknown): User {
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const inner = (r['data'] ?? r['user'] ?? r['payload']) as unknown;
      if (inner && typeof inner === 'object') {
        return this.mapApiUser(inner);
      }
    }
    return this.mapApiUser(response);
  }

  private extractUserArray(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const keys = ['data', 'items', 'users', 'content', 'results', 'records', 'rows'];
      for (const k of keys) {
        const v = r[k];
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const nested = this.extractUserArray(v);
          if (nested.length > 0) {
            return nested;
          }
        }
      }
    }
    return [];
  }

  private mapApiUser(item: unknown): User {
    const rawItem = (item || {}) as Record<string, unknown>;
    const nested = (rawItem['user'] ??
      rawItem['data'] ??
      rawItem['payload'] ??
      rawItem['attributes']) as unknown;
    const raw =
      nested && typeof nested === 'object' && !Array.isArray(nested)
        ? (nested as Record<string, unknown>)
        : rawItem;
    const role = this.normalizeRole(raw['role'] ?? raw['profil'] ?? raw['authority']);
    const statut = this.normalizeStatut(raw['status'] ?? raw['statut'] ?? raw['state']);
    return {
      id: String(raw['id'] ?? raw['userId'] ?? raw['uuid'] ?? ''),
      nom: String(raw['nom'] ?? raw['lastname'] ?? ''),
      prenom: String(raw['prenom'] ?? raw['firstname'] ?? ''),
      email: String(raw['email'] ?? raw['username'] ?? raw['login'] ?? ''),
      telephone: raw['telephone'] != null ? String(raw['telephone']) : raw['phone'] != null ? String(raw['phone']) : undefined,
      role,
      statut,
      dateEntree: this.parseDate(raw['dateEntree'] ?? raw['createdAt'] ?? raw['created_at']),
      equipe: raw['equipe'] != null ? String(raw['equipe']) : undefined,
      competences: Array.isArray(raw['competences']) ? (raw['competences'] as string[]) : [],
      langues: Array.isArray(raw['langues']) ? (raw['langues'] as string[]) : [],
      specialites: Array.isArray(raw['specialites']) ? (raw['specialites'] as string[]) : [],
    };
  }

  private normalizeRole(value: unknown): User['role'] {
    const v = String(value ?? 'agent')
      .trim()
      .toLowerCase();

    if (v === 'admin' || v === 'administrateur' || v === 'administrator' || v === 'role_admin') {
      return 'admin';
    }
    if (v === 'superviseur' || v === 'supervisor' || v === 'role_superviseur' || v === 'role_supervisor') {
      return 'superviseur';
    }
    if (v === 'agent' || v === 'role_agent' || v === 'user' || v === 'utilisateur') {
      return 'agent';
    }

    return 'agent';
  }

  private normalizeStatut(value: unknown): User['statut'] {
    const v = String(value ?? 'actif').toLowerCase();
    if (v === 'actif' || v === 'en_pause' || v === 'hors_ligne') return v;
    return 'actif';
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  private buildFallbackCreatedUser(email: string, role: User['role']): User {
    return {
      id: `tmp-${Date.now()}`,
      nom: '',
      prenom: '',
      email: email.trim().toLowerCase(),
      role,
      statut: 'actif',
      dateEntree: new Date(),
      competences: [],
      langues: ['fr'],
      specialites: [],
    };
  }

  private upsertUserInCache(user: User): void {
    const emailKey = user.email.trim().toLowerCase();
    const index = this.usersCache.findIndex(
      (candidate) =>
        (user.id && candidate.id === user.id) ||
        candidate.email.trim().toLowerCase() === emailKey
    );

    if (index >= 0) {
      this.usersCache[index] = { ...this.usersCache[index], ...user };
    } else {
      this.usersCache = [user, ...this.usersCache];
    }

    this.persistUsersCache(this.usersCache);
  }

  private persistUsersCache(users: User[]): void {
    try {
      localStorage.setItem(this.usersCacheStorageKey, JSON.stringify(users));
    } catch {
      // Ignore erreurs quota/localStorage.
    }
  }

  private restoreUsersCache(): User[] {
    try {
      const raw = localStorage.getItem(this.usersCacheStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => this.mapApiUser(item))
        .filter((user) => Boolean(user.email || user.id));
    } catch {
      return [];
    }
  }
}
