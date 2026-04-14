import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { ApiService } from './api';

export interface CreatePriorityPayload {
  label: string;
}

export interface CreateRolePayload {
  label: string;
  niveau: string;
  maxTickets: number;
  categoryId: string[];
}

export interface UpdateRolePayload {
  label?: string;
  niveau?: string;
  maxTickets?: number;
  categoryId?: string[];
}

export interface CreateCategoryPayload {
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParametrageService {
  private readonly prioritiesPath = '/api/v1/priority';
  private readonly rolesPath = '/api/v1/role';
  private readonly categoriesPath = '/api/v1/category';

  constructor(private api: ApiService) {}

  createPriority(payload: CreatePriorityPayload): Observable<unknown> {
    return from(this.api.post<unknown>(this.prioritiesPath, payload));
  }

  getPriorities(): Observable<unknown> {
    return from(this.api.get<unknown>(this.prioritiesPath));
  }

  createRole(payload: CreateRolePayload): Observable<unknown> {
    return from(this.api.post<unknown>(this.rolesPath, payload, { responseType: 'none' }));
  }

  getRoles(): Observable<unknown> {
    return from(this.api.get<unknown>(this.rolesPath));
  }

  getRoleById(roleId: string): Observable<unknown> {
    return from(this.api.get<unknown>(`${this.rolesPath}/${roleId}`));
  }

  updateRole(roleId: string, payload: UpdateRolePayload): Observable<unknown> {
    return from(this.api.put<unknown>(`${this.rolesPath}/${roleId}`, payload, { responseType: 'none' }));
  }

  deleteRole(roleId: string): Observable<unknown> {
    return from(this.api.delete<unknown>(`${this.rolesPath}/${roleId}`, { responseType: 'none' }));
  }

  createCategory(payload: CreateCategoryPayload): Observable<unknown> {
    return from(this.api.post<unknown>(this.categoriesPath, payload));
  }

  getCategories(): Observable<unknown> {
    return from(this.api.get<unknown>(this.categoriesPath));
  }
}
