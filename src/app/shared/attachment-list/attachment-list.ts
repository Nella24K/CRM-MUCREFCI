import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment } from '../../models/attachment';

@Component({
  selector: 'app-attachment-list',
  imports: [CommonModule],
  templateUrl: './attachment-list.html',
  styleUrl: './attachment-list.css',
})
export class AttachmentList {
  @Input() attachments: Attachment[] = [];
  @Output() download = new EventEmitter<Attachment>();

  formatTaille(octets: number): string {
    if (octets < 1024) {
      return `${octets} o`;
    } else if (octets < 1024 * 1024) {
      return `${(octets / 1024).toFixed(1)} Ko`;
    } else {
      return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
    }
  }

  getFileIcon(extension: string): string {
    const icons: { [key: string]: string } = {
      '.pdf': '📄',
      '.jpg': '🖼️',
      '.jpeg': '🖼️',
      '.png': '🖼️',
      '.doc': '📝',
      '.docx': '📝',
      '.xls': '📊',
      '.xlsx': '📊'
    };
    return icons[extension.toLowerCase()] || '📎';
  }

  onDownload(attachment: Attachment): void {
    this.download.emit(attachment);
  }

  isScanned(attachment: Attachment): boolean {
    return attachment.scanne && attachment.scanResultat === 'clean';
  }
}
