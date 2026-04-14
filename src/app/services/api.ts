import { Injectable } from '@angular/core';
import { runtimeEnv } from '../config/runtime-env';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  withAuth?: boolean;
  timeoutMs?: number;
  responseType?: 'auto' | 'json' | 'text' | 'none';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly details?: unknown
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = runtimeEnv.apiBaseUrl.replace(/\/+$/, '');

  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options?.headers || {}),
    };

    if (body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (options?.withAuth !== false) {
      const token =
        localStorage.getItem('TOKEN') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const timeoutMs = options?.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const isEmptyResponse = response.status === 204;
      const responseType = options?.responseType ?? 'auto';

      let payload: unknown = null;
      if (responseType === 'none' && !isEmptyResponse) {
        // Toujours consommer le corps : sinon fetch peut rester "en suspens" selon navigateur / proxy,
        // ce qui laisse le bouton en chargement alors que le serveur a déjà répondu.
        const raw = await response.text();
        if (raw.trim()) {
          const looksJson = isJson || raw.trim().startsWith('{') || raw.trim().startsWith('[');
          if (looksJson) {
            try {
              payload = JSON.parse(raw) as unknown;
            } catch {
              payload = raw;
            }
          } else {
            payload = raw;
          }
        }
      } else if (!isEmptyResponse) {
        if (responseType === 'json' || (responseType === 'auto' && isJson)) {
          payload = await response.json();
        } else if (responseType === 'text' || responseType === 'auto') {
          payload = await response.text();
        }
      }

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText || 'Erreur API', payload);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Délai dépassé: le serveur met trop de temps à répondre');
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Impossible de joindre le serveur API', error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string): string {
    const sanitizedPath = path.trim();
    const normalizedPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `${this.baseUrl}${normalizedPath}`;
  }
}
