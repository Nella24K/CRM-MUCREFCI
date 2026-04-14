import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parametrages-tags',
  imports: [CommonModule],
  templateUrl: './tags.html',
  styleUrl: './tags.css',
})
export class ParametragesTags {
  constructor(private router: Router) {}

  tags = [
    { nom: 'urgent', couleur: '#ef4444', tickets: 11 },
    { nom: 'vip', couleur: '#f59e0b', tickets: 7 },
    { nom: 'suivi', couleur: '#2563eb', tickets: 19 },
  ];

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }
}
