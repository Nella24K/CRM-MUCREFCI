import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TemplateCanal = 'email' | 'whatsapp';

interface Template {
  id: string;
  nom: string;
  canal: TemplateCanal;
  contenu: string;
  categorie: 'reception' | 'cloture' | 'satisfaction' | 'autre';
}

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.html',
  styleUrls: ['./messagerie.css'],
})
export class Messagerie {
  messageChannel: 'email' | 'whatsapp' = 'email';
  showSendPopup: boolean = false;
  showEmailComposePopup: boolean = false;
  showWhatsappComposePopup: boolean = false;

  // ---------------- Templates ----------------
  templates: Template[] = [
    {
      id: 'tpl-reception-1',
      nom: 'Réception de ticket (au client)',
      canal: 'email',
      categorie: 'reception',
      contenu:
        'Bonjour,\n\nNous avons bien reçu votre demande. Nous revenons vers vous dès que possible.\n\nRéférence: {{ticketReference}}\n\nCordialement,\nL’équipe support.',
    },
    {
      id: 'tpl-cloture-1',
      nom: 'Clôture de ticket (notification)',
      canal: 'email',
      categorie: 'cloture',
      contenu:
        'Bonjour,\n\nVotre ticket {{ticketReference}} a été clôturé.\nSi vous avez encore une question, vous pouvez nous recontacter.\n\nMerci,\nL’équipe support.',
    },
    {
      id: 'tpl-satisfaction-1',
      nom: 'Demande de satisfaction',
      canal: 'email',
      categorie: 'satisfaction',
      contenu:
        'Bonjour,\n\nPour améliorer notre service, pouvez-vous nous donner votre avis sur votre ticket {{ticketReference}} ?\n\nMerci d’avance,\nL’équipe support.',
    },
    {
      id: 'tpl-autre-1',
      nom: 'Message de relance (en retard SLA)',
      canal: 'whatsapp',
      categorie: 'autre',
      contenu:
        'Bonjour,\n\nNous traitons votre demande et faisons le nécessaire. Merci pour votre patience concernant le ticket {{ticketReference}}.',
    },
    {
      id: 'tpl-reception-whatsapp-1',
      nom: 'Réception de ticket (WhatsApp)',
      canal: 'whatsapp',
      categorie: 'reception',
      contenu:
        'Bonjour,\n\nNous avons bien reçu votre demande. Référence: {{ticketReference}}.\n\nNous revenons vers vous dès que possible.',
    },
    {
      id: 'tpl-cloture-whatsapp-1',
      nom: 'Clôture de ticket (WhatsApp)',
      canal: 'whatsapp',
      categorie: 'cloture',
      contenu:
        'Bonjour,\n\nVotre ticket {{ticketReference}} a été clôturé.\nSi besoin, vous pouvez nous recontacter.',
    },
    {
      id: 'tpl-satisfaction-whatsapp-1',
      nom: 'Demande de satisfaction (WhatsApp)',
      canal: 'whatsapp',
      categorie: 'satisfaction',
      contenu:
        'Bonjour,\n\nPour améliorer notre service, pouvez-vous donner votre avis sur votre ticket {{ticketReference}} ? Merci d’avance !',
    },
  ];

  showEditTemplatePopup: boolean = false;
  templateEditingId: string | null = null;
  templateDraft: { nom: string; canal: TemplateCanal; contenu: string } = {
    nom: '',
    canal: 'email',
    contenu: '',
  };

  private buildNewTemplateDraft(): void {
    this.templateEditingId = null;
    this.templateDraft = { nom: '', canal: 'email', contenu: '' };
  }

  openCreateTemplate(): void {
    this.buildNewTemplateDraft();
    this.showEditTemplatePopup = true;
  }

  openEditTemplate(tpl: Template): void {
    this.templateEditingId = tpl.id;
    this.templateDraft = {
      nom: tpl.nom,
      canal: tpl.canal,
      contenu: tpl.contenu,
    };
    this.showEditTemplatePopup = true;
  }

  closeEditTemplatePopup(): void {
    this.showEditTemplatePopup = false;
  }

  saveTemplate(): void {
    const trimmedNom = (this.templateDraft.nom || '').trim();
    const trimmedContenu = (this.templateDraft.contenu || '').trim();

    if (!trimmedNom || !trimmedContenu) {
      // simple validation UI
      return;
    }

    if (this.templateEditingId) {
      this.templates = this.templates.map(t => {
        if (t.id !== this.templateEditingId) return t;
        return {
          ...t,
          nom: trimmedNom,
          canal: this.templateDraft.canal,
          contenu: trimmedContenu,
        };
      });
    } else {
      const newId = `tpl-${Date.now()}`;
      this.templates = [
        ...this.templates,
        {
          id: newId,
          nom: trimmedNom,
          canal: this.templateDraft.canal,
          contenu: trimmedContenu,
          categorie: 'autre',
        },
      ];
    }

    this.showEditTemplatePopup = false;
  }

  preview(contenu: string): string {
    const s = contenu || '';
    if (s.length <= 90) return s;
    return s.slice(0, 90) + '...';
  }

  getCanalLabel(canal: TemplateCanal): string {
    return canal === 'email' ? 'Email' : 'WhatsApp';
  }

  // ---------------- Envoi message ----------------
  openSendMessagePopup(): void {
    this.messageChannel = 'email';
    this.showSendPopup = true;
  }

  closeSendMessagePopup(): void {
    this.showSendPopup = false;
  }

  confirmSendMessage(): void {
    this.showSendPopup = false;
    if (this.messageChannel === 'email') {
      this.openEmailComposePopup();
    } else {
      this.openWhatsappComposePopup();
    }
  }

  // ---------------- Composer Email (type Outlook) ----------------
  emailTo: string = '';
  emailSubject: string = '';
  emailBody: string = '';
  selectedEmailTemplateId: string | null = null;

  get emailTemplates(): Template[] {
    return this.templates.filter(t => t.canal === 'email');
  }

  openEmailComposePopup(): void {
    this.showWhatsappComposePopup = false;
    this.showEmailComposePopup = true;

    const first = this.emailTemplates[0];
    if (first) {
      this.selectedEmailTemplateId = first.id;
      this.emailSubject = first.nom;
      this.emailBody = first.contenu;
    } else {
      this.selectedEmailTemplateId = null;
      this.emailSubject = '';
      this.emailBody = '';
    }
  }

  closeEmailComposePopup(): void {
    this.showEmailComposePopup = false;
  }

  onEmailTemplateChange(): void {
    if (!this.selectedEmailTemplateId) return;
    const tpl = this.templates.find(t => t.id === this.selectedEmailTemplateId && t.canal === 'email');
    if (!tpl) return;
    this.emailSubject = tpl.nom;
    this.emailBody = tpl.contenu;
  }

  sendEmail(): void {
    // Placeholder: plus tard on branchera l'envoi à l'API
    this.showEmailComposePopup = false;
    alert('Email prêt à être envoyé (placeholder).');
  }

  // ---------------- Composer WhatsApp (placeholder) ----------------
  openWhatsappComposePopup(): void {
    this.showEmailComposePopup = false;
    this.showWhatsappComposePopup = true;

    const first = this.whatsappTemplates[0];
    if (first) {
      this.selectedWhatsappTemplateId = first.id;
      this.whatsappBody = first.contenu;
    } else {
      this.selectedWhatsappTemplateId = null;
      this.whatsappBody = '';
    }
  }

  closeWhatsappComposePopup(): void {
    this.showWhatsappComposePopup = false;
  }

  sendWhatsapp(): void {
    this.showWhatsappComposePopup = false;
    alert('WhatsApp prêt à être envoyé (placeholder).');
  }

  whatsappTo: string = '';
  selectedWhatsappTemplateId: string | null = null;
  whatsappBody: string = '';

  get whatsappTemplates(): Template[] {
    return this.templates.filter(t => t.canal === 'whatsapp');
  }

  onWhatsappTemplateChange(): void {
    if (!this.selectedWhatsappTemplateId) return;
    const tpl = this.templates.find(
      t => t.id === this.selectedWhatsappTemplateId && t.canal === 'whatsapp'
    );
    if (!tpl) return;
    this.whatsappBody = tpl.contenu;
  }
}

