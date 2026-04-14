import { Injectable } from '@angular/core';
import { Observable, from, of, tap, catchError, finalize } from 'rxjs';
import { ApiService } from './api';

/**
 * Réponse de ton API de connexion.
 * Adapte les noms des champs si ton API renvoie autre chose (ex: access_token au lieu de token).
 */
export interface LoginResponse {
  token: string;           // ou access_token, jwt, etc.
  accessToken?: string;
  access_token?: string;
  user?: {
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    role?: string;
  };
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Valeur attendue par l’API pour le flux mot de passe oublié (OTP). */
export const OTP_PURPOSE_REINITIALISATION_MDP = 'RENITIALISATION_MOT_PASSE';

export interface RequestOtpPayload {
  email: string;
  purpose?: typeof OTP_PURPOSE_REINITIALISATION_MDP;
}

export interface VerifyOtpPayload {
  email: string;
  purpose: typeof OTP_PURPOSE_REINITIALISATION_MDP;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginPath = '/api/v1/auth/login';
  private readonly loginPathFallback = '/api/v1/auth/login/';
  private readonly requestOtpPath = '/api/v1/auth/request-otp';
  private readonly verifyOtpPath = '/api/v1/auth/verify-otp';
  private readonly resetPasswordPath = '/api/v1/auth/reset-password';
  private readonly logoutPath = '/api/v1/auth/logout';
  private readonly logoutPathFallback = '/api/v1/auth/logout/';

  constructor(private api: ApiService) {}

  /**
   * Connexion : envoie email + mot de passe à l'API.
   * Si l'API renvoie un token, il est stocké (localStorage ou sessionStorage selon "rememberMe").
   */
  login(email: string, password: string, rememberMe: boolean = false): Observable<LoginResponse> {
    return from(
      this.loginRequest(email, password)
    ).pipe(
      tap((response) => {
        const raw = response as unknown as Record<string, unknown>;
        const data = (raw?.['data'] as Record<string, unknown> | undefined) || undefined;
        const access = (raw?.['access'] as Record<string, unknown> | undefined) || undefined;

        const token =
          this.asString(raw?.['token']) ||
          this.asString(raw?.['accessToken']) ||
          this.asString(raw?.['access_token']) ||
          this.asString(data?.['token']) ||
          this.asString(data?.['accessToken']) ||
          this.asString(data?.['access_token']) ||
          this.asString(access?.['token']) ||
          '';

        const userInfos =
          (raw?.['user'] as Record<string, unknown> | null | undefined) ||
          (data?.['user'] as Record<string, unknown> | null | undefined) ||
          // Si l'API ne renvoie pas explicitement "user", on conserve la réponse utile
          (data ? data : raw);
        const tokenUserInfos = this.extractUserInfosFromToken(token);
        const resolvedUserInfos =
          userInfos && typeof userInfos === 'object' ? userInfos : tokenUserInfos;

        // Nettoyer les anciennes valeurs avant stockage (sans appeler l’API déconnexion)
        this.clearLocalSession();

        const tokenStorage = rememberMe ? localStorage : sessionStorage;
        const userStorage = rememberMe ? localStorage : sessionStorage;

        if (token) {
          tokenStorage.setItem('TOKEN', token);
          tokenStorage.setItem('token', token); // Compatibilité avec le code existant
        }
        if (response.refreshToken) {
          tokenStorage.setItem('refreshToken', response.refreshToken);
        }
        if (resolvedUserInfos && typeof resolvedUserInfos === 'object') {
          const serializedUser = JSON.stringify(resolvedUserInfos);
          userStorage.setItem('USER_INFOS', serializedUser);
          userStorage.setItem('userInfos', serializedUser); // Compatibilité
          userStorage.setItem('user', serializedUser); // Compatibilité
        }
      })
    );
  }

  private async loginRequest(email: string, password: string): Promise<LoginResponse> {
    const payloads: Array<Record<string, string>> = [
      { email, password },
      { username: email, password },
      { login: email, password },
    ];

    let lastError: unknown;
    for (const payload of payloads) {
      try {
        return await this.api.post<LoginResponse>(this.loginPath, payload, { withAuth: false });
      } catch (error) {
        lastError = error;
      }
    }

    // Certains backends exposent uniquement la route avec slash final.
    for (const payload of payloads) {
      try {
        return await this.api.post<LoginResponse>(this.loginPathFallback, payload, { withAuth: false });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  /**
   * Déconnexion côté serveur (révoque la session / token si l’API le supporte),
   * puis suppression locale du token et des infos utilisateur.
   * En cas d’échec réseau ou d’erreur API, le nettoyage local est quand même effectué.
   */
  logout(): Observable<void> {
    return from(this.logoutRequest()).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearLocalSession())
    );
  }

  /** Supprime uniquement le stockage local (ex. avant une nouvelle connexion). */
  private clearLocalSession(): void {
    localStorage.removeItem('TOKEN');
    localStorage.removeItem('USER_INFOS');
    localStorage.removeItem('userInfos');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('TOKEN');
    sessionStorage.removeItem('USER_INFOS');
    sessionStorage.removeItem('userInfos');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }

  private async logoutRequest(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      return;
    }

    try {
      await this.api.post<unknown>(this.logoutPath, {}, { withAuth: true, responseType: 'none' });
    } catch {
      await this.api.post<unknown>(this.logoutPathFallback, {}, { withAuth: true, responseType: 'none' });
    }
  }

  /** Indique si l'utilisateur est connecté (a un token) */
  isLoggedIn(): boolean {
    return !!(
      localStorage.getItem('TOKEN') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')
    );
  }

  /** Récupère le token (pour l'envoyer dans les requêtes protégées) */
  getToken(): string | null {
    return (
      localStorage.getItem('TOKEN') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')
    );
  }

  /** Récupère les infos utilisateur stockées */
  getStoredUser(): { id: string; email: string; nom?: string; prenom?: string; role?: string } | null {
    const raw =
      localStorage.getItem('USER_INFOS') ||
      localStorage.getItem('userInfos') ||
      localStorage.getItem('user') ||
      sessionStorage.getItem('USER_INFOS') ||
      sessionStorage.getItem('userInfos') ||
      sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  private extractUserInfosFromToken(token: string): Record<string, unknown> | null {
    if (!token || token.split('.').length < 2) {
      return null;
    }

    try {
      const payloadSegment = token.split('.')[1];
      const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const claims = JSON.parse(decoded) as Record<string, unknown>;

      const prenom = this.asString(claims['given_name']) || this.asString(claims['prenom']);
      const nom = this.asString(claims['family_name']) || this.asString(claims['nom']);
      const email =
        this.asString(claims['email']) ||
        this.asString(claims['preferred_username']) ||
        this.asString(claims['upn']) ||
        this.asString(claims['sub']);
      const role =
        this.asString(claims['role']) ||
        this.asString(claims['roles']) ||
        this.asString(claims['authority']);
      const id = this.asString(claims['sub']) || this.asString(claims['userId']);

      return {
        ...claims,
        id,
        email,
        prenom,
        nom,
        role,
      };
    } catch {
      return null;
    }
  }

  requestOtp(email: string): Observable<unknown> {
    const payload: RequestOtpPayload = {
      email,
      purpose: OTP_PURPOSE_REINITIALISATION_MDP,
    };
    return from(
      this.api.post<unknown>(this.requestOtpPath, payload, {
        withAuth: false,
        responseType: 'none',
      })
    );
  }

  verifyOtp(email: string, code: string): Observable<unknown> {
    const payload: VerifyOtpPayload = {
      email,
      purpose: OTP_PURPOSE_REINITIALISATION_MDP,
      code,
    };
    return from(
      this.api.post<unknown>(this.verifyOtpPath, payload, {
        withAuth: false,
        responseType: 'none',
      })
    );
  }

  resetPassword(email: string, otp: string, newPassword: string): Observable<unknown> {
    const payload: ResetPasswordPayload = { email, otp, newPassword };
    return from(
      this.api.post<unknown>(this.resetPasswordPath, payload, {
        withAuth: false,
        responseType: 'none',
      })
    );
  }
}
