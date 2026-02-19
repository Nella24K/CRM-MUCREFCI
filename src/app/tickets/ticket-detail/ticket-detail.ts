import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../services/ticket';
import { Ticket } from '../../models/ticket';
import { Attachment } from '../../models/attachment';
import { EmailDisplay } from '../../shared/email-display/email-display';
import { AttachmentList } from '../../shared/attachment-list/attachment-list';

interface TicketAction {
  id: string;
  type: 'status_change' | 'note' | 'response' | 'assignment' | 'closure';
  user: string;
  date: Date;
  description: string;
  details?: any;
}

@Component({
  selector: 'app-ticket-detail',
  imports: [CommonModule, FormsModule, EmailDisplay, AttachmentList],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.css',
})
export class TicketDetail implements OnInit {
  ticket: Ticket | null = null;
  ticketId: string = '';
  
  // Actions
  showStatusModal = false;
  showResponseModal = false;
  showNoteModal = false;
  showCloseModal = false;
  
  // Formulaires
  newStatus: string = '';
  responseMessage: string = '';
  responseCanal: 'email' | 'whatsapp' = 'email';
  noteInterne: string = '';
  satisfactionNote: number = 0;
  
  // Historique
  actions: TicketAction[] = [];
  
  // Agents
  agents = [
    { id: 'agent1', nom: 'Marie KONÉ' },
    { id: 'agent2', nom: 'Jean KOUASSI' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id') || '';
    if (this.ticketId) {
      this.loadTicket();
    }
  }

  loadTicket(): void {
    this.ticketService.getTicketById(this.ticketId).subscribe({
      next: (ticket: Ticket | undefined) => {
        if (ticket) {
          this.ticket = ticket;
          this.newStatus = ticket.statut;
          this.loadHistory();
        } else {
          alert('Ticket non trouvé');
          this.router.navigate(['/tickets']);
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement du ticket:', error);
        alert('Erreur lors du chargement du ticket');
        this.router.navigate(['/tickets']);
      }
    });
  }

  loadHistory(): void {
    if (!this.ticket) return;
    
    // Simuler l'historique
    this.actions = [
      {
        id: '1',
        type: 'status_change',
        user: 'Marie KONÉ',
        date: new Date(this.ticket.dateCreation),
        description: `Ticket créé avec le statut "${this.ticket.statut}"`,
        details: { statut: this.ticket.statut }
      }
    ];

    if (this.ticket.datePremiereReponse) {
      this.actions.push({
        id: '2',
        type: 'response',
        user: this.ticket.assigneANom || 'Agent',
        date: new Date(this.ticket.datePremiereReponse),
        description: `Première réponse envoyée par ${this.ticket.canal}`,
        details: { canal: this.ticket.canal }
      });
    }

    if (this.ticket.notesInternes && this.ticket.notesInternes.length > 0) {
      this.ticket.notesInternes.forEach((note, index) => {
        this.actions.push({
          id: `note-${index}`,
          type: 'note',
          user: this.ticket!.assigneANom || 'Agent',
          date: new Date(),
          description: note
        });
      });
    }
  }

  updateStatus(): void {
    if (!this.ticket || !this.newStatus) return;

    this.ticketService.updateTicket(this.ticket.id, { statut: this.newStatus as any }).subscribe({
      next: (updatedTicket: Ticket) => {
        this.ticket = updatedTicket;
        this.showStatusModal = false;
        this.loadHistory();
        alert('Statut mis à jour avec succès !');
      },
      error: (error: any) => {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Erreur lors de la mise à jour du statut');
      }
    });
  }

  sendResponse(): void {
    if (!this.ticket || !this.responseMessage.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    // Simuler l'envoi de la réponse
    const now = new Date();
    const updates: Partial<Ticket> = {
      datePremiereReponse: this.ticket.datePremiereReponse || now,
      statut: 'en_attente_client'
    };

    this.ticketService.updateTicket(this.ticket.id, updates).subscribe({
      next: (updatedTicket: Ticket) => {
        this.ticket = updatedTicket;
        this.showResponseModal = false;
        this.responseMessage = '';
        this.loadHistory();
        alert(`Réponse envoyée par ${this.responseCanal} avec succès !`);
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'envoi:', error);
        alert('Erreur lors de l\'envoi de la réponse');
      }
    });
  }

  addNote(): void {
    if (!this.ticket || !this.noteInterne.trim()) {
      alert('Veuillez saisir une note');
      return;
    }

    const notes = this.ticket.notesInternes || [];
    notes.push(this.noteInterne);

    this.ticketService.updateTicket(this.ticket.id, { notesInternes: notes }).subscribe({
      next: (updatedTicket: Ticket) => {
        this.ticket = updatedTicket;
        this.showNoteModal = false;
        this.noteInterne = '';
        this.loadHistory();
        alert('Note ajoutée avec succès !');
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'ajout:', error);
        alert('Erreur lors de l\'ajout de la note');
      }
    });
  }

  closeTicket(): void {
    if (!this.ticket) return;

    if (!confirm('Êtes-vous sûr de vouloir clôturer ce ticket ?')) {
      return;
    }

    const now = new Date();
    const updates: Partial<Ticket> = {
      statut: 'clos',
      dateResolution: now,
      satisfaction: this.satisfactionNote || undefined
    };

    this.ticketService.updateTicket(this.ticket.id, updates).subscribe({
      next: (updatedTicket: Ticket) => {
        this.ticket = updatedTicket;
        this.showCloseModal = false;
        this.satisfactionNote = 0;
        this.loadHistory();
        alert('Ticket clôturé avec succès !');
      },
      error: (error: any) => {
        console.error('Erreur lors de la clôture:', error);
        alert('Erreur lors de la clôture du ticket');
      }
    });
  }

  assignToAgent(agentId: string): void {
    if (!this.ticket) return;

    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;

    this.ticketService.updateTicket(this.ticket.id, {
      assigneA: agentId,
      assigneANom: agent.nom
    }).subscribe({
      next: (updatedTicket: Ticket) => {
        this.ticket = updatedTicket;
        this.loadHistory();
        alert(`Ticket assigné à ${agent.nom} !`);
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'assignation:', error);
        alert('Erreur lors de l\'assignation');
      }
    });
  }

  getStatusClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'nouveau': 'status-new',
      'en_cours': 'status-in-progress',
      'en_attente': 'status-pending',
      'en_attente_client': 'status-waiting',
      'resolu': 'status-resolved',
      'clos': 'status-closed',
      'en_retard': 'status-overdue'
    };
    return classes[statut] || '';
  }

  getPriorityClass(priorite: string): string {
    const classes: { [key: string]: string } = {
      'urgente': 'priority-urgent',
      'haute': 'priority-high',
      'normale': 'priority-normal',
      'basse': 'priority-low'
    };
    return classes[priorite] || '';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTemps(minutes: number | undefined): string {
    if (!minutes) return '-';
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${heures}h ${mins}min` : `${heures}h`;
  }

  isSLAOverdue(): boolean {
    if (!this.ticket || !this.ticket.dateEcheanceSLA) return false;
    return new Date() > new Date(this.ticket.dateEcheanceSLA) && 
           (this.ticket.statut === 'nouveau' || this.ticket.statut === 'en_cours' || this.ticket.statut === 'en_attente');
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }

  downloadAttachment(attachment: Attachment): void {
    // Appel au service pour télécharger la pièce jointe
    // Quand le backend sera prêt, utiliser: this.ticketService.downloadAttachment(attachment.id)
    console.log('Téléchargement de:', attachment.nomFichier);
    // Pour l'instant, simulation
    alert(`Téléchargement de ${attachment.nomFichier}`);
  }
}
