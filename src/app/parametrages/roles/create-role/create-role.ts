import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ParametrageService } from '../../../services/parametrage';
import { toFriendlyErrorMessage } from '../../../utils/error-messages';

@Component({
  selector: 'app-create-role',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-role.html',
  styleUrl: './create-role.css',
})
export class CreateRole implements OnInit {
  newRole = {
    label: '',
    niveau: '',
    maxTickets: 0,
  };
  selectedCategoryId = '';
  categoryOptions: Array<{ id: string; label: string }> = [];
  isLoadingCategories = false;
  isSubmitting = false;
  categoryErrorMessage = '';

  constructor(
    private readonly parametrageService: ParametrageService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryErrorMessage = '';

    this.parametrageService.getCategories().subscribe({
      next: (response) => {
        this.categoryOptions = this.extractCategoryOptions(response);
        this.isLoadingCategories = false;
      },
      error: () => {
        this.categoryErrorMessage = 'Impossible de charger les catégories.';
        this.isLoadingCategories = false;
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

  submit(): void {
    const label = this.newRole.label.trim();
    const niveau = this.newRole.niveau.trim();
    const categoryId = this.selectedCategoryId ? [this.selectedCategoryId] : [];

    if (!label || !niveau || categoryId.length === 0) {
      this.toastr.error('Les champs label, niveau et catégorie sont requis.', 'Validation');
      return;
    }

    this.isSubmitting = true;

    this.parametrageService
      .createRole({
        label,
        niveau,
        maxTickets: Number(this.newRole.maxTickets) || 0,
        categoryId,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Rôle créé avec succès.', 'Succès');
          this.router.navigate(['/parametrages/roles']);
        },
        error: (error) => {
          this.toastr.error(toFriendlyErrorMessage(error, 'create-role'), 'Erreur');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/parametrages/roles']);
  }

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }
}
