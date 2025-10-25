import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'JUGADOR' | 'ENTRENADOR' | 'ADMINISTRADOR';
  position?: string;
  age?: number;
  phone?: string;
  jerseyNumber?: number;
  license?: string;
  experienceYears?: number;
  specialization?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const user = localStorage.getItem('current_user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  // Cargar perfil completo desde la BD
  loadUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/profile`, {
      headers: this.getHeaders()
    }).pipe(
      tap(user => {
        // Actualizar el usuario en localStorage y BehaviorSubject
        localStorage.setItem('current_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  getCoachProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/coach/profile`, {
      headers: this.getHeaders() 
    });
  }

  updateUserProfile(profileData: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/profile`, profileData, {
      headers: this.getHeaders()
    }).pipe(
      tap(updatedUser => {
        // Actualizar el usuario en el localStorage y BehaviorSubject
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        this.currentUserSubject.next(updatedUser);
      })
    );
  }
}