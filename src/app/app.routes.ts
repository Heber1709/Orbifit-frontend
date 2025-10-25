import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { PlayerDashboardComponent } from './components/player-dashboard/player-dashboard.component';
import { CoachDashboardComponent } from './components/coach-dashboard/coach-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'player', component: PlayerDashboardComponent },
  { path: 'coach', component: CoachDashboardComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];