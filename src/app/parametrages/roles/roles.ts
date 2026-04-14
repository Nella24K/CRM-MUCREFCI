import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CreateRolePayload, ParametrageService, UpdateRolePayload } from '../../services/parametrage';

export interface RoleRow {
  id: string;
  code: string;
  label: string;
  niveau: string;
  maxTickets: number;
  categoriesDisplay: string;
  utilisateurs: number;
}

@Component({
  selector: 'app-parametrages-roles',
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class ParametragesRoles implements OnInit {
  roles: RoleRow[] = [];
  isLoading = false;
  loadErrorMessage = '';
  isSaving = false;
  isDeleting = false;
  showRoleModal = false;
  isEditing = false;
  currentRoleId = '';
  roleForm = {
    label: '',
    niveau: '',
    maxTickets: 0,
    categoryId: '',
  };
  categoryOptions: Array<{ id: string; label: string }> = [];
  formErrorMessage = '';
  private categoryIdToLabel = new Map<string, string>();

  constructor(
    private readonly parametrageService: ParametrageService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategoriesThenRoles();
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.currentRoleId = '';
    this.formErrorMessage = '';
    this.roleForm = {
      label: '',
      niveau: '',
      maxTickets: 0,
      categoryId: this.categoryOptions[0]?.id ?? '',
    };
    this.showRoleModal = true;
  }

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }

  closeRoleModal(): void {
    if (this.isSaving) {
      return;
    }
    this.showRoleModal = false;
  }

  openEditModal(role: RoleRow): void {
    this.isEditing = true;
    this.currentRoleId = role.id;
    this.formErrorMessage = '';
    this.isLoading = true;
    this.parametrageService.getRoleById(role.id).subscribe({
      next: (response) => {
        const fullRole = this.extractRoleRecord(response);
        const selectedCategory = this.extractCategoryIds(
          fullRole?.['categories'] ?? fullRole?.['categoryId'] ?? fullRole?.['category_id']
        )[0] ?? '';

        this.roleForm = {
          label: this.extractStringField(fullRole, ['label', 'name', 'nom']) || role.label,
          niveau: this.extractStringField(fullRole, ['niveau', 'level']) || role.niveau,
          maxTickets: this.extractNumberField(fullRole, ['maxTickets', 'maxTicket', 'max_tickets']) ?? role.maxTickets,
          categoryId: selectedCategory,
        };
        this.showRoleModal = true;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Impossible de charger ce rôle.', 'Erreur');
      },
    });
  }

  submitRole(): void {
    const label = this.roleForm.label.trim();
    const niveau = this.roleForm.niveau.trim();
    const categoryId = this.roleForm.categoryId ? [this.roleForm.categoryId] : [];
    const maxTickets = Number(this.roleForm.maxTickets) || 0;

    if (!label || !niveau || categoryId.length === 0) {
      this.formErrorMessage = 'Les champs libellé, niveau et catégorie sont obligatoires.';
      return;
    }

    this.formErrorMessage = '';
    this.isSaving = true;

    if (this.isEditing && this.currentRoleId) {
      const payload: UpdateRolePayload = { label, niveau, maxTickets, categoryId };
      this.parametrageService.updateRole(this.currentRoleId, payload).pipe(
        finalize(() => (this.isSaving = false))
      ).subscribe({
        next: () => {
          this.showRoleModal = false;
          this.toastr.success('Rôle modifié avec succès.', 'Succès');
          this.loadRoles();
        },
        error: () => {
          this.toastr.error('La modification du rôle a échoué.', 'Erreur');
        },
      });
      return;
    }

    const payload: CreateRolePayload = { label, niveau, maxTickets, categoryId };
    this.parametrageService.createRole(payload).pipe(
      finalize(() => (this.isSaving = false))
    ).subscribe({
      next: () => {
        this.showRoleModal = false;
        this.toastr.success('Rôle créé avec succès.', 'Succès');
        this.loadRoles();
      },
      error: () => {
        this.toastr.error('La création du rôle a échoué.', 'Erreur');
      },
    });
  }

  deleteRole(role: RoleRow): void {
    const confirmation = confirm(`Supprimer le rôle "${role.label}" ?`);
    if (!confirmation) {
      return;
    }
    this.isDeleting = true;
    this.parametrageService.deleteRole(role.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.toastr.success('Rôle supprimé avec succès.', 'Succès');
        this.loadRoles();
      },
      error: () => {
        this.isDeleting = false;
        this.toastr.error('La suppression du rôle a échoué.', 'Erreur');
      },
    });
  }

  private loadCategoriesThenRoles(): void {
    this.parametrageService.getCategories().subscribe({
      next: (response) => {
        this.categoryIdToLabel = this.buildCategoryMap(response);
        this.categoryOptions = this.extractCategoryOptions(response);
        this.loadRoles();
      },
      error: () => {
        this.categoryIdToLabel = new Map();
        this.categoryOptions = [];
        this.loadRoles();
      },
    });
  }

  private extractCategoryOptions(payload: unknown): Array<{ id: string; label: string }> {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : [];

    if (!Array.isArray(rawList)) {
      return [];
    }

    return rawList
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const candidate = item as Record<string, unknown>;
        const id = [candidate['id'], candidate['_id'], candidate['uuid']].find(
          (value) => typeof value === 'string' && value.trim().length > 0
        ) as string | undefined;
        const label = [candidate['label'], candidate['nom'], candidate['name']].find(
          (value) => typeof value === 'string' && value.trim().length > 0
        ) as string | undefined;
        if (!id || !label) {
          return null;
        }
        return { id, label };
      })
      .filter((item): item is { id: string; label: string } => item !== null);
  }

  private buildCategoryMap(payload: unknown): Map<string, string> {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : [];

    const map = new Map<string, string>();
    if (!Array.isArray(rawList)) {
      return map;
    }

    for (const item of rawList) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const candidate = item as Record<string, unknown>;
      const id = [candidate['id'], candidate['_id'], candidate['uuid']].find(
        (value) => typeof value === 'string' && value.trim().length > 0
      ) as string | undefined;
      const label = [candidate['label'], candidate['nom'], candidate['name']].find(
        (value) => typeof value === 'string' && value.trim().length > 0
      ) as string | undefined;
      if (id && label) {
        map.set(id, label);
      }
    }
    return map;
  }

  private loadRoles(): void {
    this.isLoading = true;
    this.loadErrorMessage = '';

    this.parametrageService.getRoles().subscribe({
      next: (response) => {
        this.roles = this.extractRoleRows(response);
        this.isLoading = false;
      },
      error: () => {
        this.roles = [];
        this.loadErrorMessage = 'Impossible de charger les rôles.';
        this.isLoading = false;
      },
    });
  }

  private extractRoleRows(payload: unknown): RoleRow[] {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : [];

    if (!Array.isArray(rawList)) {
      return [];
    }

    return rawList
      .map((item) => this.mapItemToRoleRow(item))
      .filter((row): row is RoleRow => row !== null);
  }

  private mapItemToRoleRow(item: unknown): RoleRow | null {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const raw = item as Record<string, unknown>;
    const id = [raw['id'], raw['_id'], raw['uuid']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
    const code = [raw['code'], raw['key']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
    const label = [raw['label'], raw['name'], raw['nom']]
      .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

    if (!id || !label) {
      return null;
    }

    const niveauRaw = raw['niveau'] ?? raw['level'];
    const niveau = typeof niveauRaw === 'string' || typeof niveauRaw === 'number' ? String(niveauRaw) : '';

    const maxTicketsRaw = raw['maxTicket'] ?? raw['maxTickets'] ?? raw['max_tickets'];
    const maxTickets =
      typeof maxTicketsRaw === 'number'
        ? maxTicketsRaw
        : typeof maxTicketsRaw === 'string'
          ? Number(maxTicketsRaw) || 0
          : 0;

    const categoriesDisplay = this.formatCategories(raw['categories'] ?? raw['categoryId'] ?? raw['category_id']);

    const usersRaw = raw['userCount'] ?? raw['utilisateurs'] ?? raw['usersCount'] ?? raw['users'];
    let utilisateurs = 0;
    if (typeof usersRaw === 'number') {
      utilisateurs = usersRaw;
    } else if (typeof usersRaw === 'string') {
      utilisateurs = Number(usersRaw) || 0;
    }

    return {
      id,
      code: code ?? '—',
      label,
      niveau,
      maxTickets,
      categoriesDisplay,
      utilisateurs,
    };
  }

  private extractCategoryIds(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const candidate = item as Record<string, unknown>;
            return [candidate['id'], candidate['_id'], candidate['uuid']].find(
              (id) => typeof id === 'string' && id.trim().length > 0
            ) as string | undefined;
          }
          return undefined;
        })
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value];
    }
    return [];
  }

  private formatCategoryLabels(ids: string[]): string {
    if (ids.length === 0) {
      return '—';
    }
    const labels = ids.map((id) => this.categoryIdToLabel.get(id) ?? id);
    return labels.join(', ');
  }

  private formatCategories(value: unknown): string {
    if (Array.isArray(value)) {
      const labels = value
        .map((item) => {
          if (item && typeof item === 'object') {
            const candidate = item as Record<string, unknown>;
            const label = [candidate['label'], candidate['name'], candidate['nom']].find(
              (entry) => typeof entry === 'string' && entry.trim().length > 0
            ) as string | undefined;
            if (label) return label;
          }
          if (typeof item === 'string') {
            return this.categoryIdToLabel.get(item) ?? item;
          }
          return null;
        })
        .filter((label): label is string => label !== null);

      if (labels.length > 0) {
        return labels.join(', ');
      }
    }

    const ids = this.extractCategoryIds(value);
    return this.formatCategoryLabels(ids);
  }

  private extractRoleRecord(payload: unknown): Record<string, unknown> | null {
    if (payload && typeof payload === 'object') {
      const asRecord = payload as Record<string, unknown>;
      const candidate = asRecord['data'] ?? asRecord['role'] ?? asRecord['payload'];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as Record<string, unknown>;
      }
      return asRecord;
    }
    return null;
  }

  private extractStringField(record: Record<string, unknown> | null, keys: string[]): string {
    if (!record) return '';
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return '';
  }

  private extractNumberField(record: Record<string, unknown> | null, keys: string[]): number | null {
    if (!record) return null;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}
