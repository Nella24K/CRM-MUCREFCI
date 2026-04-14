import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type SatisfactionCategory = 'reception' | 'cloture' | 'satisfaction' | 'autre';

interface SatisfactionAvis {
  id: string;
  nom: string;
  note: number; // 1..5
  date: string; // ISO
  commentaire: string;
  categorie: SatisfactionCategory;
}

@Component({
  selector: 'app-satisfaction',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './satisfaction.html',
  styleUrls: ['./satisfaction.css'],
})
export class Satisfaction {
  avisClients: SatisfactionAvis[] = [
    {
      id: 'av-1',
      nom: 'Amadou Diarra',
      note: 5,
      date: '2026-03-10',
      commentaire: 'Réponse rapide et solution claire. Merci !',
      categorie: 'reception',
    },
    {
      id: 'av-2',
      nom: 'Nadia Koné',
      note: 4,
      date: '2026-03-08',
      commentaire: 'Bon suivi. J’ai apprécié le professionnalisme.',
      categorie: 'cloture',
    },
    {
      id: 'av-3',
      nom: 'Moussa Diallo',
      note: 5,
      date: '2026-03-06',
      commentaire: 'Très satisfait, l’équipe a réglé mon problème rapidement.',
      categorie: 'satisfaction',
    },
    {
      id: 'av-4',
      nom: 'Sarah Traoré',
      note: 4,
      date: '2026-03-04',
      commentaire: 'Globalement bien, petit délai mais résultat au top.',
      categorie: 'autre',
    },
    {
      id: 'av-5',
      nom: 'Fatou Keita',
      note: 2,
      date: '2026-03-01',
      commentaire: 'Manque de communication au début.',
      categorie: 'reception',
    },
    {
      id: 'av-6',
      nom: 'Yao Nguessan',
      note: 5,
      date: '2026-02-27',
      commentaire: 'Service excellent. Je recommande.',
      categorie: 'cloture',
    },
  ];

  get averageSatisfaction(): number {
    if (!this.avisClients.length) return 0;
    const sum = this.avisClients.reduce((acc, a) => acc + (a.note || 0), 0);
    return sum / this.avisClients.length;
  }

  get averageSatisfactionRounded(): number {
    return Math.round(this.averageSatisfaction);
  }

  get satisfiedClients(): SatisfactionAvis[] {
    return this.avisClients
      .filter(a => a.note >= 4)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  getInitials(nom: string): string {
    const parts = (nom || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getSatisfactionModeLabel(note: number): string {
    if (note >= 5) return 'Très satisfait';
    if (note >= 4) return 'Satisfait';
    if (note >= 3) return 'Moyen';
    if (note >= 2) return 'Insatisfait';
    return 'Très insatisfait';
  }
}

