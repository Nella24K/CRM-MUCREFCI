import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailSource } from '../../models/email-source';

@Component({
  selector: 'app-email-display',
  imports: [CommonModule],
  templateUrl: './email-display.html',
  styleUrl: './email-display.css',
})
export class EmailDisplay {
  @Input() emailSource!: EmailSource;

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  hasCcOrBcc(): boolean {
    return !!(this.emailSource.cc && this.emailSource.cc.length > 0) ||
           !!(this.emailSource.bcc && this.emailSource.bcc.length > 0);
  }
}
