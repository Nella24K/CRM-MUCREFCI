import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Header } from './header/header';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, Sidebar, Header],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  isSidebarCollapsed = false;
  showOverlay = false;

  @HostListener('window:resize')
  onResize(): void {
    this.handleResize();
  }

  ngOnInit(): void {
    this.handleResize();
  }

  handleResize(): void {
    // Sur mobile/tablette, fermer la sidebar par défaut
    if (window.innerWidth <= 1024) {
      this.isSidebarCollapsed = true;
      this.showOverlay = false;
    } else {
      // Sur desktop, ne pas afficher l'overlay
      this.showOverlay = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    
    // Afficher l'overlay sur mobile/tablette quand la sidebar est ouverte
    if (window.innerWidth <= 1024) {
      this.showOverlay = !this.isSidebarCollapsed;
    }
  }

  closeSidebar(): void {
    if (window.innerWidth <= 1024) {
      this.isSidebarCollapsed = true;
      this.showOverlay = false;
    }
  }
}
