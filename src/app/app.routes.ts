import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { Dashboard } from './dashboard/dashboard';
import { Clients } from './clients/clients';
import { Tickets } from './tickets/tickets';
import { TicketDetail } from './tickets/ticket-detail/ticket-detail';
import { Supervision } from './supervision/supervision';
import { Satisfaction } from './satisfaction/satisfaction';
import { Profil } from './profil/profil';
import { Users } from './users/users';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'clients',
        component: Clients
      },
      {
        path: 'tickets',
        component: Tickets
      },
      {
        path: 'tickets/all',
        component: Tickets
      },
      {
        path: 'tickets/:id',
        component: TicketDetail
      },
      {
        path: 'supervision',
        component: Supervision
      },
      {
        path: 'satisfaction',
        component: Satisfaction
      },
      {
        path: 'profil',
        component: Profil
      },
      {
        path: 'users',
        component: Users
      },
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
