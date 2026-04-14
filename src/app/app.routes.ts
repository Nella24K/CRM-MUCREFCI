import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Logout } from './logout/logout';
import { Layout } from './layout/layout';
import { Dashboard } from './dashboard/dashboard';
import { Clients } from './clients/clients';
import { CreateClient } from './clients/create-client/create-client';
import { ClientDetails } from './clients/client-details/client-details';
import { EditClient } from './clients/edit-client/edit-client';
import { Tickets } from './tickets/tickets';
import { TicketDetail } from './tickets/ticket-detail/ticket-detail';
import { Supervision } from './supervision/supervision';
import { Satisfaction } from './satisfaction/satisfaction';
import { Profil } from './profil/profil';
import { Users } from './users/users';
import { Messagerie } from './messagerie/messagerie';
import { Parametrages } from './parametrages/parametrages';
import { ParametragesPriorites } from './parametrages/priorites/priorites';
import { ParametragesRoles } from './parametrages/roles/roles';
import { CreateRole } from './parametrages/roles/create-role/create-role';
import { ParametragesCategories } from './parametrages/categories/categories';
import { ParametragesFichiers } from './parametrages/fichiers/fichiers';
import { ParametragesTags } from './parametrages/tags/tags';
import { ForgotPassword } from './forgot-password/forgot-password';
import { ResetPassword } from './forgot-password/reset-password/reset-password';

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
    path: 'logout',
    component: Logout
  },
  {
    path: 'forgot-password',
    component: ForgotPassword
  },
  {
    path: 'forgot-password/otp',
    component: ForgotPassword
  },
  {
    path: 'forgot-password/reset',
    component: ResetPassword
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
        path: 'clients/create',
        component: CreateClient
      },
      {
        path: 'clients/:id/edit',
        component: EditClient
      },
      {
        path: 'clients/:id',
        component: ClientDetails
      },
      {
        path: 'tickets',
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
        path: 'messagerie',
        component: Messagerie
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
        path: 'parametrages/priorites',
        component: ParametragesPriorites
      },
      {
        path: 'parametrages/roles/create',
        component: CreateRole
      },
      {
        path: 'parametrages/roles',
        component: ParametragesRoles
      },
      {
        path: 'parametrages/categories',
        component: ParametragesCategories
      },
      {
        path: 'parametrages/fichiers',
        component: ParametragesFichiers
      },
      {
        path: 'parametrages/tags',
        component: ParametragesTags
      },
      {
        path: 'parametrages',
        component: Parametrages
      },
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
