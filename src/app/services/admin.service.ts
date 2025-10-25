import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  status: string;
}

export interface SystemStats {
  totalUsers: number;
  totalPlayers: number;
  totalCoaches: number;
  totalAdmins: number;
  activeTrainings: number;
  totalTournaments: number;
}

export interface ReportData {
  userStats: {
    byRole: Array<{ role: string, _count: { id: number } }>;
    byStatus: Array<{ isActive: boolean, _count: { id: number } }>;
    newThisMonth: number;
    total: number;
  };
  trainingStats: {
    byType: Array<{ type: string, _count: { id: number } }>;
    monthly: { [key: string]: number };
    total: number;
    active: number;
  };
  tournamentStats: {
    byStatus: Array<{ status: string, _count: { id: number } }>;
    total: number;
  };
  systemStats: {
    generatedAt: string;
    storageUsed: string;
    //uptime: string;
  };
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/admin';

  constructor(private http: HttpClient) {}

  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/stats`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  getAllTrainings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trainings`);
  }

  generateReports(): Observable<ReportData> {
    return this.http.get<ReportData>(`${this.apiUrl}/reports`);
  }

  createUser(userData: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData);
  }

  updateUser(userId: number, userData: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, userData);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }
}