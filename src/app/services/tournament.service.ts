import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVO' | 'PROGRAMADO' | 'FINALIZADO';
  teamsCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private apiUrl = 'http://localhost:3000/tournaments';

  constructor(private http: HttpClient) {}

  getAllTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(this.apiUrl);
  }

  createTournament(tournamentData: any): Observable<Tournament> {
    return this.http.post<Tournament>(this.apiUrl, tournamentData);
  }

  updateTournament(tournamentId: number, tournamentData: any): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.apiUrl}/${tournamentId}`, tournamentData);
  }

  deleteTournament(tournamentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${tournamentId}`);
  }

  getTournamentStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }
}