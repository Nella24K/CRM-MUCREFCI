import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy, DoCheck, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy, DoCheck {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  
  showUserMenu = false;
  showNotifications = false;
  showLogoutDialog = false;
  currentDateTime: string = '';
  private dateTimeInterval: any;
  private plusOneTimeout: any;
  private lastUnreadCount = 0;
  showPlusOne = false;
  currentUserName = 'Utilisateur';
  
  notifications = [
    { id: 1, message: 'Nouveau ticket créé', time: 'Il y a 5 min', read: false },
    { id: 2, message: 'Ticket en retard SLA', time: 'Il y a 1h', read: false },
    { id: 3, message: 'Nouveau client ajouté', time: 'Il y a 2h', read: true },
  ];
  
  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.updateDateTime();
    this.refreshCurrentUser();
    this.lastUnreadCount = this.unreadCount;
    // Mettre à jour toutes les minutes
    this.dateTimeInterval = setInterval(() => {
      this.updateDateTime();
    }, 60000);
  }

  ngDoCheck(): void {
    const currentUnread = this.unreadCount;
    if (currentUnread > this.lastUnreadCount) {
      this.triggerPlusOne();
    }
    this.lastUnreadCount = currentUnread;
    this.refreshCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
    }
    if (this.plusOneTimeout) {
      clearTimeout(this.plusOneTimeout);
    }
  }

  private triggerPlusOne(): void {
    this.showPlusOne = true;
    if (this.plusOneTimeout) {
      clearTimeout(this.plusOneTimeout);
    }
    this.plusOneTimeout = setTimeout(() => {
      this.showPlusOne = false;
    }, 1500);
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

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showLogoutDialog) {
      this.showLogoutDialog = false;
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

  openLogoutDialog(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.closeUserMenu();
    this.showLogoutDialog = true;
  }

  cancelLogoutDialog(): void {
    this.showLogoutDialog = false;
  }

  confirmLogout(): void {
    this.showLogoutDialog = false;
    this.router.navigate(['/logout']);
  }

  private refreshCurrentUser(): void {
    const user = this.authService.getStoredUser();
    if (!user) {
      this.currentUserName = 'Utilisateur';
      return;
    }
    const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim();
    this.currentUserName = fullName || user.email || 'Utilisateur';
  }
}
