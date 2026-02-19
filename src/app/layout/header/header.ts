import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  showUserMenu = false;
  showNotifications = false;
  currentDateTime: string = '';
  private dateTimeInterval: any;
  
  notifications = [
    { id: 1, message: 'Nouveau ticket créé', time: 'Il y a 5 min', read: false },
    { id: 2, message: 'Ticket en retard SLA', time: 'Il y a 1h', read: false },
    { id: 3, message: 'Nouveau client ajouté', time: 'Il y a 2h', read: true },
  ];
  
  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateDateTime();
    // Mettre à jour toutes les minutes
    this.dateTimeInterval = setInterval(() => {
      this.updateDateTime();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
    }
  }

  private updateDateTime(): void {
    const now = new Date();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    this.currentDateTime = `${day} ${date} ${month} ${year} - ${hours}:${minutes}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userProfileContainer = target.closest('.user-profile-container');
    const notificationContainer = target.closest('.notification-container');
    
    if (!userProfileContainer && this.showUserMenu) {
      this.closeUserMenu();
    }
    
    if (!notificationContainer && this.showNotifications) {
      this.closeNotifications();
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showUserMenu = false;
    }
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  goToProfil(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.closeUserMenu();
    this.router.navigate(['/profil']);
  }

  onLogout(): void {
    // Déconnexion selon CDC
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      // Ici, vous pouvez ajouter la logique de déconnexion (nettoyer le token, etc.)
      this.router.navigate(['/login']);
    }
  }
}
