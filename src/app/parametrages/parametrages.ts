import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-parametrages',
  imports: [CommonModule, RouterModule],
  templateUrl: './parametrages.html',
  styleUrl: './parametrages.css',
})
export class Parametrages {
  settingsCards = [
    {
      title: 'Priorités',
      description: 'Gérer les niveaux de priorité pour les tickets.',
      route: '/parametrages/priorites',
    },
    {
      title: 'Rôles',
      description: 'Définir les rôles et leurs responsabilités.',
      route: '/parametrages/roles',
    },
    {
      title: 'Catégories',
      description: 'Organiser les tickets par catégories.',
      route: '/parametrages/categories',
    },
    {
      title: 'Fichiers',
      description: 'Configurer les types de fichiers autorisés.',
      route: '/parametrages/fichiers',
    },
    {
      title: 'Tags',
      description: 'Créer des tags pour le classement rapide.',
      route: '/parametrages/tags',
    },
  ];
}
