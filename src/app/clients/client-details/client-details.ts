import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Client } from '../../models/client';
import { ClientService } from '../../services/client';

@Component({
  selector: 'app-client-details',
  imports: [CommonModule],
  templateUrl: './client-details.html',
  styleUrl: './client-details.css',
})
export class ClientDetails implements OnInit {
  isLoading = true;
  client: Client | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly clientService: ClientService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/clients']);
      return;
    }
    const cachedClient = this.clientService.getCachedClientById(id);
    if (cachedClient) {
      this.client = cachedClient;
      this.isLoading = false;
    }
    this.clientService.getClientByIdApi(id).subscribe({
      next: (client) => {
        this.client = client;
        this.isLoading = false;
      },
      error: () => {
        if (!this.client) {
          this.router.navigate(['/clients']);
        }
        this.isLoading = false;
      },
    });
  }

  back(): void {
    this.router.navigate(['/clients']);
  }
}
