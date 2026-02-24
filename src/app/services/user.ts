import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'api/users'; // À remplacer par votre URL API réelle

  // Données mockées pour le développement
  private mockUsers: User[] = [
    {
      id: '1',
      nom: 'KONÉ',
      prenom: 'Marie',
      email: 'marie.kone@mucrefci.ngser.com',
      telephone: '+225 07 12 34 56 78',
      role: 'agent',
      statut: 'actif',
      dateEntree: new Date('2023-01-15'),
      equipe: 'Service Client',
      competences: ['Réclamations', 'Facturation', 'Assistance technique'],
      langues: ['fr', 'en'],
      specialites: ['Support technique', 'Gestion factures']
    },
    {
      id: '2',
      nom: 'KOUASSI',
      prenom: 'Jean',
      email: 'jean.kouassi@mucrefci.ngser.com',
      telephone: '+225 07 23 45 67 89',
      role: 'agent_senior',
      statut: 'actif',
      dateEntree: new Date('2022-06-10'),
      equipe: 'Service Client',
      competences: ['Réclamations', 'Formation', 'Supervision'],
      langues: ['fr', 'en'],
      specialites: ['Gestion complexe', 'Formation équipe']
    },
    {
      id: '3',
      nom: 'TRAORE',
      prenom: 'Sophie',
      email: 'sophie.traore@mucrefci.ngser.com',
      telephone: '+225 07 34 56 78 90',
      role: 'superviseur',
      statut: 'actif',
      dateEntree: new Date('2021-03-20'),
      equipe: 'Service Client',
      competences: ['Supervision', 'Reporting', 'Gestion équipe'],
      langues: ['fr', 'en'],
      specialites: ['Supervision équipe', 'Analyse performance']
    },
    {
      id: '4',
      nom: 'DIALLO',
      prenom: 'Thomas',
      email: 'thomas.diallo@mucrefci.ngser.com',
      telephone: '+225 07 45 67 89 01',
      role: 'admin',
      statut: 'actif',
      dateEntree: new Date('2020-09-01'),
      equipe: 'Administration',
      competences: ['Administration', 'Configuration', 'Sécurité'],
      langues: ['fr', 'en'],
      specialites: ['Administration système', 'Gestion utilisateurs']
    },
    {
      id: '5',
      nom: 'SANGARE',
      prenom: 'Alice',
      email: 'alice.sangare@mucrefci.ngser.com',
      telephone: '+225 07 56 78 90 12',
      role: 'stagiaire',
      statut: 'actif',
      dateEntree: new Date('2024-01-10'),
      equipe: 'Service Client',
      competences: ['Support basique'],
      langues: ['fr'],
      specialites: ['Premier niveau']
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les utilisateurs
   */
  getUsers(): Observable<User[]> {
    // Plus tard: return this.http.get<User[]>(this.apiUrl);
    return of([...this.mockUsers]);
  }

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: string): Observable<User | undefined> {
    const user = this.mockUsers.find(u => u.id === id);
    // Plus tard: return this.http.get<User>(`${this.apiUrl}/${id}`);
    return of(user);
  }

  /**
   * Récupère un utilisateur par son email
   */
  getUserByEmail(email: string): Observable<User | undefined> {
    const user = this.mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    return of(user);
  }

  /**
   * Crée un nouvel utilisateur
   */
  createUser(user: Omit<User, 'id' | 'dateEntree'>): Observable<User> {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      dateEntree: new Date(),
      statut: user.statut || 'actif',
      competences: user.competences || [],
      langues: user.langues || ['fr'],
      specialites: user.specialites || []
    };
    this.mockUsers.push(newUser);
    // Plus tard: return this.http.post<User>(this.apiUrl, user);
    return of(newUser);
  }

  /**
   * Met à jour un utilisateur
   */
  updateUser(id: string, user: Partial<User>): Observable<User> {
    const index = this.mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      this.mockUsers[index] = {
        ...this.mockUsers[index],
        ...user,
        id
      };
      // Plus tard: return this.http.put<User>(`${this.apiUrl}/${id}`, user);
      return of(this.mockUsers[index]);
    }
    throw new Error('Utilisateur non trouvé');
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(id: string): Observable<void> {
    const index = this.mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      this.mockUsers.splice(index, 1);
      // Plus tard: return this.http.delete<void>(`${this.apiUrl}/${id}`);
      return of(undefined);
    }
    throw new Error('Utilisateur non trouvé');
  }

  /**
   * Désactive un utilisateur (change son statut)
   */
  deactivateUser(id: string): Observable<User> {
    return this.updateUser(id, { statut: 'hors_ligne' });
  }

  /**
   * Active un utilisateur
   */
  activateUser(id: string): Observable<User> {
    return this.updateUser(id, { statut: 'actif' });
  }

  /**
   * Récupère les utilisateurs par rôle
   */
  getUsersByRole(role: User['role']): Observable<User[]> {
    const users = this.mockUsers.filter(u => u.role === role);
    return of(users);
  }

  /**
   * Récupère les utilisateurs par équipe
   */
  getUsersByEquipe(equipe: string): Observable<User[]> {
    const users = this.mockUsers.filter(u => u.equipe === equipe);
    return of(users);
  }

  /**
   * Vérifie si un email est déjà utilisé
   */
  isEmailTaken(email: string, excludeUserId?: string): Observable<boolean> {
    const user = this.mockUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      (!excludeUserId || u.id !== excludeUserId)
    );
    return of(!!user);
  }
}
