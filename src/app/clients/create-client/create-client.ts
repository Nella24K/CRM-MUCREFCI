import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiError } from '../../services/api';
import { ClientService, CreateClientPayload } from '../../services/client';

@Component({
  selector: 'app-create-client',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-client.html',
  styleUrl: './create-client.css',
})
export class CreateClient {
  isSubmitting = false;
  private readonly clientTagsStorageKey = 'client_tags_v1';
  readonly newTagValue = '__new__';
  selectedTag = '';
  customTag = '';
  availableTags: string[] = [];

  formData: CreateClientPayload = {
    tag: '',
    matricule: '',
    firstname: '',
    lastname: '',
    birthdate: '',
    lieu_naissance: '',
    nationalite: '',
    categorie_professionnelle: '',
    status: 'actif',
    email: '',
    phone: '',
    whatsapp: '',
    adresse: '',
  };

  constructor(
    private readonly clientService: ClientService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {
    this.availableTags = this.loadAvailableTags();
    this.selectedTag = this.availableTags[0] || '';
    this.formData.tag = this.selectedTag;
  }

  submit(): void {
    this.formData.tag = this.resolveTagValue();

    if (!this.formData.firstname || !this.formData.lastname || !this.formData.email) {
      this.toastr.error('Prénom, nom et email sont obligatoires.', 'Validation');
      return;
    }

    this.isSubmitting = true;
    this.clientService.createClientApi(this.formData).subscribe({
      next: (response) => {
        if (this.formData.tag) {
          this.saveTag(this.formData.tag);
        }
        this.clientService.registerClientAfterCreate(response, this.formData);
        this.isSubmitting = false;
        this.toastr.success('Client créé avec succès.', 'Succès');
        this.router.navigate(['/clients']);
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        const message = this.extractError(error);
        this.toastr.error(message, 'Création impossible');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }

  onTagSelectionChange(): void {
    if (this.selectedTag !== this.newTagValue) {
      this.customTag = '';
      this.formData.tag = this.selectedTag;
    }
  }

  private resolveTagValue(): string {
    if (this.selectedTag === this.newTagValue) {
      return this.customTag.trim();
    }
    return this.selectedTag.trim();
  }

  private loadAvailableTags(): string[] {
    try {
      const stored = localStorage.getItem(this.clientTagsStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.length > 0)
        .filter((tag, index, array) => array.indexOf(tag) === index);
    } catch {
      return [];
    }
  }

  private saveTag(tag: string): void {
    const normalizedTag = tag.trim();
    if (!normalizedTag) {
      return;
    }
    if (!this.availableTags.includes(normalizedTag)) {
      this.availableTags = [...this.availableTags, normalizedTag];
      localStorage.setItem(this.clientTagsStorageKey, JSON.stringify(this.availableTags));
    }
  }

  private extractError(error: unknown): string {
    if (error instanceof ApiError) {
      if (typeof error.details === 'object' && error.details && 'message' in error.details) {
        const backendMessage = (error.details as { message?: string }).message;
        if (backendMessage) {
          return backendMessage;
        }
      }
      return error.statusText || 'Erreur lors de la création du client.';
    }
    return 'Erreur lors de la création du client.';
  }
}
