import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parametrages-fichiers',
  imports: [CommonModule],
  templateUrl: './fichiers.html',
  styleUrl: './fichiers.css',
})
export class ParametragesFichiers {
  constructor(private router: Router) {}

  fichiers = [
    { extension: '.pdf', tailleMax: '10 MB', autorise: 'Oui' },
    { extension: '.png', tailleMax: '5 MB', autorise: 'Oui' },
    { extension: '.exe', tailleMax: '-', autorise: 'Non' },
  ];

  goToParametrages(): void {
    this.router.navigate(['/parametrages']);
  }
}
