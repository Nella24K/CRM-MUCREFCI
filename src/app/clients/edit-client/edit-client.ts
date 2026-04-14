import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ClientService, CreateClientPayload } from '../../services/client';

@Component({
  selector: 'app-edit-client',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-client.html',
  styleUrl: './edit-client.css',
})
export class EditClient implements OnInit {
  isLoading = true;
  isSubmitting = false;
  clientId = '';
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly clientService: ClientService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/clients']);
      return;
    }
    this.clientId = id;
    const cachedClient = this.clientService.getCachedClientById(id);
    if (cachedClient) {
      this.formData = {
        tag: cachedClient.tag || '',
        matricule: cachedClient.matricule || '',
        firstname: cachedClient.firstname || cachedClient.prenom || '',
        lastname: cachedClient.lastname || cachedClient.nom || '',
        birthdate: cachedClient.birthdate || '',
        lieu_naissance: cachedClient.lieu_naissance || '',
        nationalite: cachedClient.nationalite || '',
        categorie_professionnelle: cachedClient.categorie_professionnelle || '',
        status: cachedClient.status || cachedClient.statut || 'actif',
        email: cachedClient.email || '',
        phone: cachedClient.phone || cachedClient.telephone || '',
        whatsapp: cachedClient.whatsapp || '',
        adresse: cachedClient.adresse || '',
      };
      this.isLoading = false;
    }
    this.clientService.getClientByIdApi(id).subscribe({
      next: (client) => {
        this.formData = {
          tag: client.tag || '',
          matricule: client.matricule || '',
          firstname: client.firstname || client.prenom || '',
          lastname: client.lastname || client.nom || '',
          birthdate: client.birthdate || '',
          lieu_naissance: client.lieu_naissance || '',
          nationalite: client.nationalite || '',
          categorie_professionnelle: client.categorie_professionnelle || '',
          status: client.status || client.statut || 'actif',
          email: client.email || '',
          phone: client.phone || client.telephone || '',
          whatsapp: client.whatsapp || '',
          adresse: client.adresse || '',
        };
        this.isLoading = false;
      },
      error: () => {
        if (!cachedClient) {
          this.toastr.error('Client introuvable', 'Erreur');
          this.router.navigate(['/clients']);
        }
        this.isLoading = false;
      },
    });
  }

  submit(): void {
    this.isSubmitting = true;
    this.clientService.updateClientApi(this.clientId, this.formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastr.success('Client modifié avec succès', 'Succès');
        this.router.navigate(['/clients']);
      },
      error: () => {
        this.isSubmitting = false;
        this.toastr.error('Modification impossible', 'Erreur');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }
}
