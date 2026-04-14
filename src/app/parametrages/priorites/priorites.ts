import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParametrageService } from '../../services/parametrage';
import { ApiError } from '../../services/api';

interface PriorityItem {
  id: string;
  nom: string;
  delai: string;
  tickets: number;
}

@Component({
  selector: 'app-parametrages-priorites',
  imports: [CommonModule, FormsModule],
  templateUrl: './priorites.html',
  styleUrl: './priorites.css',
})
export class ParametragesPriorites implements OnInit {
  newPriorityLabel = '';
  isSubmitting = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  priorites: PriorityItem[] = [];

  constructor(
    private parametrageService: ParametrageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPriorities();
  }

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }

  loadPriorities(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.parametrageService.getPriorities().subscribe({
      next: (response) => {
        this.priorites = this.mapPrioritiesResponse(response);
        this.isLoading = false;
      },
      error: () => {
        this.priorites = [];
        this.errorMessage = 'Impossible de charger les priorités.';
        this.isLoading = false;
      },
    });
  }

  createPriority(): void {
    const label = this.newPriorityLabel.trim();
    if (!label) {
      this.errorMessage = 'Le label de la priorité est requis.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.parametrageService.createPriority({ label }).subscribe({
      next: (response) => {
        const created = this.mapSinglePriority(response);
        this.priorites = [created || { id: `tmp-${Date.now()}`, nom: label, delai: '-', tickets: 0 }, ...this.priorites];
        this.newPriorityLabel = '';
        this.successMessage = 'Priorité créée avec succès.';
        this.isSubmitting = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.isSubmitting = false;
      },
    });
  }

  trackByPriority(index: number, priorite: PriorityItem): string {
    return priorite.id || `${priorite.nom}-${index}`;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return `La création a échoué (${error.status}) : ${error.statusText || 'Erreur API'}`;
    }
    return 'La création de la priorité a échoué.';
  }

  private mapPrioritiesResponse(response: unknown): PriorityItem[] {
    const list = this.extractArray(response);
    return list.map((item, index) => this.toPriorityItem(item, index));
  }

  private mapSinglePriority(response: unknown): PriorityItem | null {
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const inner = (r['data'] ?? r['priority'] ?? r['payload']) as unknown;
      if (inner && typeof inner === 'object') {
        return this.toPriorityItem(inner, 0);
      }
    }
    if (response && typeof response === 'object') {
      return this.toPriorityItem(response, 0);
    }
    return null;
  }

  private extractArray(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const keys = ['data', 'items', 'priorities', 'content', 'results', 'records', 'rows'];
      for (const key of keys) {
        const value = r[key];
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const nested = this.extractArray(value);
          if (nested.length > 0) return nested;
        }
      }
    }
    return [];
  }

  private toPriorityItem(item: unknown, index: number): PriorityItem {
    const raw = (item || {}) as Record<string, unknown>;
    const nom = String(raw['label'] ?? raw['nom'] ?? raw['name'] ?? `Priorité ${index + 1}`);
    const ticketsCount = Number(raw['tickets'] ?? raw['ticketsCount'] ?? raw['count'] ?? 0);
    const delai = String(raw['delai'] ?? raw['sla'] ?? raw['targetDelay'] ?? '-');
    return {
      id: String(raw['id'] ?? raw['uuid'] ?? `${nom}-${index}`),
      nom,
      delai,
      tickets: Number.isFinite(ticketsCount) ? ticketsCount : 0,
    };
  }
}
