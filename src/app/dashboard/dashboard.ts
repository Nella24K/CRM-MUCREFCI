import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, Chart, registerables } from 'chart.js';
import { TicketService } from '../services/ticket';
import { DashboardStats, ChartData } from '../models/ticket';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Enregistrer les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  // Exposer Math dans le template pour les calculs (ex: arrondir la satisfaction)
  readonly Math = Math;

  // Statistiques
  stats: DashboardStats = {
    ticketsOuverts: 0,
    ticketsEnCours: 0,
    ticketsClotures: 0,
    nouveauxTickets: 0,
    ticketsEnAttente: 0,
    ticketsEnRetardSLA: 0,
    tempsMoyenTraitement: 0,
    tauxResolution: 0,
    tempsMoyenReponse: 0,
    satisfactionClient: 0,
    volumeEmail: 0,
    volumeWhatsApp: 0,
    nombreClients: 0
  };

  isLoading: boolean = true;
  isExporting: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  // Filtres
  filters = {
    periode: 'jour' as 'jour' | 'semaine' | 'mois' | 'personnalise',
    agent: '',
    canal: '',
    statut: '',
    dateDebut: null as Date | null,
    dateFin: null as Date | null
  };

  // Recherche
  searchQuery: string = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Graphique
  chartType: 'jour' | 'semaine' | 'mois' = 'jour';
  chartTypes: ('jour' | 'semaine' | 'mois')[] = ['jour', 'semaine', 'mois'];
  chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: "'Inter', sans-serif",
            size: 13,
            weight: 500
          },
          color: '#475569'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
          weight: 500
        },
        borderColor: 'rgba(226, 232, 240, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
          lineWidth: 1
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          color: '#64748b',
          padding: 8
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          color: '#64748b',
          padding: 8
        }
      }
    }
  };
  chartTypeConfig: ChartType = 'line';

  // Alertes
  alerts: Array<{
    id: number;
    type: 'warning' | 'error' | 'info' | 'success';
    message: string;
    timestamp: Date;
  }> = [];

  // Options pour les filtres
  agents = [
    { id: 'agent1', nom: 'Marie KONÉ' },
    { id: 'agent2', nom: 'Jean KOUASSI' }
  ];

  canaux = [
    { value: 'email', label: 'Email' },
    { value: 'whatsapp', label: 'WhatsApp' }
  ];

  statuts = [
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'resolu', label: 'Résolu' },
    { value: 'clos', label: 'Clos' },
    { value: 'en_retard', label: 'En retard' }
  ];

  constructor(
    private ticketService: TicketService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.onSearch();
    });
  }

  ngOnInit(): void {
    // Charger les données en parallèle pour de meilleures performances
    this.loadDashboardData();
    // Charger le graphique avec un léger délai pour améliorer le temps de chargement perçu
    setTimeout(() => this.loadChartData(), 100);
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    // Convertir null en undefined pour le service
    const filtersForService = {
      ...this.filters,
      dateDebut: this.filters.dateDebut || undefined,
      dateFin: this.filters.dateFin || undefined
    };
    
    this.ticketService.getDashboardStats(filtersForService).subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoading = false;
        this.hasError = false;
        this.loadAlerts(); // Recharger les alertes après les stats
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Impossible de charger les statistiques. Veuillez réessayer.';
        
        // Afficher une alerte d'erreur
        this.alerts.unshift({
          id: Date.now(),
          type: 'error',
          message: this.errorMessage,
          timestamp: new Date()
        });
        
        // Essayer d'afficher une notification toast si disponible
        try {
          this.toastr.error('Erreur lors du chargement des données', 'Erreur', {
            timeOut: 5000,
            positionClass: 'toast-top-right'
          });
        } catch (e) {
          // Toastr non disponible, on garde juste l'alerte
        }
      }
    });
  }

  loadChartData(): void {
    this.ticketService.getChartData(this.chartType).subscribe({
      next: (data: ChartData) => {
        this.chartData = {
          labels: data.labels,
          datasets: data.datasets.map(dataset => ({
            ...dataset,
            fill: true,
            tension: 0.4
          }))
        };
        // Forcer la détection de changement pour mettre à jour le graphique
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données du graphique:', error);
        // Afficher une alerte d'erreur pour les graphiques
        this.alerts.unshift({
          id: Date.now(),
          type: 'error',
          message: 'Impossible de charger les données du graphique. Veuillez réessayer.',
          timestamp: new Date()
        });
        
        // Essayer d'afficher une notification toast si disponible
        try {
          this.toastr.error('Erreur lors du chargement des graphiques', 'Erreur', {
            timeOut: 4000,
            positionClass: 'toast-top-right'
          });
        } catch (e) {
          // Toastr non disponible
        }
      }
    });
  }

  loadAlerts(): void {
    // Générer des alertes dynamiques basées sur les stats
    const newAlerts: typeof this.alerts = [];
    
    if (this.stats.ticketsEnRetardSLA > 0) {
      newAlerts.push({
        id: Date.now() + 1,
        type: 'warning',
        message: `${this.stats.ticketsEnRetardSLA} ticket(s) en retard SLA - Action requise`,
        timestamp: new Date()
      });
    }
    
    if (this.stats.nouveauxTickets > 0) {
      newAlerts.push({
        id: Date.now() + 2,
        type: 'info',
        message: `${this.stats.nouveauxTickets} nouveau(x) ticket(s) aujourd'hui`,
        timestamp: new Date()
      });
    }

    if (this.stats.tauxResolution < 70) {
      newAlerts.push({
        id: Date.now() + 3,
        type: 'warning',
        message: `Taux de résolution faible (${this.stats.tauxResolution}%) - Amélioration nécessaire`,
        timestamp: new Date()
      });
    }

    // Garder seulement les 5 dernières alertes
    this.alerts = [...newAlerts, ...this.alerts].slice(0, 5);
  }

  onFilterChange(): void {
    // Debounce pour éviter trop d'appels API
    clearTimeout((this as any).filterTimeout);
    (this as any).filterTimeout = setTimeout(() => {
      try {
        this.loadDashboardData();
        this.loadChartData();
      } catch (error: any) {
        this.alerts.unshift({
          id: Date.now(),
          type: 'error',
          message: 'Erreur lors de l\'application des filtres. Veuillez réessayer.',
          timestamp: new Date()
        });
      }
    }, 300);
  }

  onChartTypeChange(): void {
    this.loadChartData();
  }

  onChartTypeSelect(type: 'jour' | 'semaine' | 'mois'): void {
    this.chartType = type;
    this.onChartTypeChange();
  }

  getChartTypeLabel(type: 'jour' | 'semaine' | 'mois'): string {
    switch (type) {
      case 'jour': return 'Journalier';
      case 'semaine': return 'Hebdomadaire';
      case 'mois': return 'Mensuel';
    }
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onSearch(): void {
    if (!this.searchQuery || this.searchQuery.trim().length === 0) {
      // Si la recherche est vide, recharger toutes les données
      this.loadDashboardData();
      return;
    }
    
    // La recherche peut être implémentée pour filtrer les tickets affichés
    // Pour l'instant, on recharge les données
    try {
      this.loadDashboardData();
    } catch (error: any) {
      this.alerts.unshift({
        id: Date.now(),
        type: 'error',
        message: 'Erreur lors de la recherche. Veuillez réessayer.',
        timestamp: new Date()
      });
    }
  }

  exportToExcel(): void {
    this.isExporting = true;
    
    try {
      // Vérifier si les données sont disponibles
      if (!this.stats) {
        throw new Error('Aucune donnée disponible pour l\'export');
      }

      // Préparer les données pour l'export
      const data = [
        ['Statistiques Dashboard', ''],
        ['Date d\'export', new Date().toLocaleDateString('fr-FR')],
        [''],
        ['Métriques', 'Valeur'],
        ['Tickets ouverts', this.stats.ticketsOuverts],
        ['Tickets en cours', this.stats.ticketsEnCours],
        ['Tickets clôturés', this.stats.ticketsClotures],
        ['Nouveaux tickets', this.stats.nouveauxTickets],
        ['Tickets en attente', this.stats.ticketsEnAttente],
        ['Tickets en retard SLA', this.stats.ticketsEnRetardSLA],
        [''],
        ['Temps moyen de traitement (min)', this.stats.tempsMoyenTraitement],
        ['Taux de résolution (%)', this.stats.tauxResolution],
        ['Temps moyen de réponse (min)', this.stats.tempsMoyenReponse],
        ['Satisfaction client', this.stats.satisfactionClient],
        [''],
        ['Volume Email', this.stats.volumeEmail],
        ['Volume WhatsApp', this.stats.volumeWhatsApp],
        ['Nombre de clients', this.stats.nombreClients]
      ];

      // Créer le workbook
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');

      // Générer le nom du fichier avec la date
      const fileName = `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Télécharger le fichier
      XLSX.writeFile(wb, fileName);
      
      // Afficher une alerte de succès
      this.alerts.unshift({
        id: Date.now(),
        type: 'success',
        message: 'Export Excel réussi. Le fichier a été téléchargé.',
        timestamp: new Date()
      });
      
      // Essayer d'afficher une notification toast si disponible
      try {
        this.toastr.success('Export Excel réussi', 'Succès', {
          timeOut: 3000,
          positionClass: 'toast-top-right'
        });
      } catch (e) {
        // Toastr non disponible
      }
    } catch (error: any) {
      // Afficher une alerte d'erreur
      this.alerts.unshift({
        id: Date.now(),
        type: 'error',
        message: error?.message || 'Erreur lors de l\'export Excel. Veuillez réessayer.',
        timestamp: new Date()
      });
      
      // Essayer d'afficher une notification toast si disponible
      try {
        this.toastr.error('Erreur lors de l\'export Excel', 'Erreur', {
          timeOut: 5000,
          positionClass: 'toast-top-right'
        });
      } catch (e) {
        // Toastr non disponible
      }
    } finally {
      this.isExporting = false;
    }
  }

  formatTemps(minutes: number): string {
    if (!minutes || minutes === 0) return '0 min';
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const heures = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (heures >= 24) {
      const jours = Math.floor(heures / 24);
      const heuresRestantes = heures % 24;
      return jours > 0 ? `${jours}j ${heuresRestantes > 0 ? heuresRestantes + 'h' : ''}`.trim() : `${heuresRestantes}h`;
    }
    return mins > 0 ? `${heures}h ${mins}min` : `${heures}h`;
  }

  getTempsMoyenTraitement(): string {
    return this.formatTemps(this.stats.tempsMoyenTraitement);
  }

  getTempsMoyenReponse(): string {
    return this.formatTemps(this.stats.tempsMoyenReponse);
  }

  formatPourcentage(value: number): string {
    return `${value}%`;
  }

  dismissAlert(id: number): void {
    this.alerts = this.alerts.filter(alert => alert.id !== id);
  }

  clearFilters(): void {
    try {
      this.filters = {
        periode: 'jour',
        agent: '',
        canal: '',
        statut: '',
        dateDebut: null,
        dateFin: null
      };
      this.searchQuery = '';
      this.onFilterChange();
    } catch (error: any) {
      this.alerts.unshift({
        id: Date.now(),
        type: 'error',
        message: 'Erreur lors de la réinitialisation des filtres.',
        timestamp: new Date()
      });
    }
  }

  getDateString(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onDateDebutChange(value: string): void {
    this.filters.dateDebut = value ? new Date(value) : null;
    this.onFilterChange();
  }

  onDateFinChange(value: string): void {
    this.filters.dateFin = value ? new Date(value) : null;
    this.onFilterChange();
  }
}
