import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParametrageService } from '../../services/parametrage';

interface CategoryRow {
  id: string;
  code: string;
  label: string;
  description: string;
  statut: string;
  createdAt: string;
}

@Component({
  selector: 'app-parametrages-categories',
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class ParametragesCategories implements OnInit {
  newCategoryLabel = '';
  isSubmitting = false;
  isLoading = false;
  showCreateModal = false;
  successMessage = '';
  errorMessage = '';
  loadErrorMessage = '';

  categories: CategoryRow[] = [];

  constructor(
    private parametrageService: ParametrageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.errorMessage = '';
  }

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }

  closeCreateModal(): void {
    if (this.isSubmitting) {
      return;
    }
    this.showCreateModal = false;
    this.newCategoryLabel = '';
    this.errorMessage = '';
  }

  createCategory(): void {
    const label = this.newCategoryLabel.trim();
    if (!label) {
      this.errorMessage = 'Le label de la catégorie est requis.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.parametrageService.createCategory({ label }).subscribe({
      next: () => {
        this.newCategoryLabel = '';
        this.successMessage = 'Catégorie créée avec succès.';
        this.isSubmitting = false;
        this.showCreateModal = false;
        this.loadCategories();
      },
      error: () => {
        this.errorMessage = 'La création de la catégorie a échoué.';
        this.isSubmitting = false;
      },
    });
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.loadErrorMessage = '';

    this.parametrageService.getCategories().subscribe({
      next: (response) => {
        this.categories = this.extractCategoryRows(response);
        this.isLoading = false;
      },
      error: () => {
        this.categories = [];
        this.loadErrorMessage = 'Impossible de charger les catégories.';
        this.isLoading = false;
      },
    });
  }

  private extractCategoryRows(payload: unknown): CategoryRow[] {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : [];

    if (!Array.isArray(rawList)) {
      return [];
    }

    return rawList
      .map((item) => this.mapItemToCategoryRow(item))
      .filter((row): row is CategoryRow => row !== null);
  }

  private mapItemToCategoryRow(item: unknown): CategoryRow | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const raw = item as Record<string, unknown>;

    const id = [raw['id'], raw['_id'], raw['uuid']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
    const label = [raw['label'], raw['nom'], raw['name']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

    if (!id || !label) {
      return null;
    }

    const code = [raw['code'], raw['key']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
    const description = [raw['description'], raw['desc'], raw['details']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
    const statutRaw = raw['status'] ?? raw['statut'] ?? raw['isActive'];
    const createdAtRaw = raw['createdAt'] ?? raw['created_at'] ?? raw['creationDate'];

    return {
      id,
      code: code ?? '—',
      label,
      description: description ?? '—',
      statut: this.formatStatus(statutRaw),
      createdAt: this.formatDate(createdAtRaw),
    };
  }

  private formatStatus(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Actif' : 'Inactif';
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return '—';
      if (['active', 'actif', 'enabled', 'enable'].includes(normalized)) return 'Actif';
      if (['inactive', 'inactif', 'disabled', 'disable'].includes(normalized)) return 'Inactif';
      return value;
    }

    return '—';
  }

  private formatDate(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
