import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Player {
  id: number;
  name: string;
  position: string;
}

export interface TeamStats {
  activePlayers: number;
  trainings: number;
  matchesPlayed: number;
  wins: number;
}

export interface Training {
  id?: number;
  title: string;
  description: string;
  type: string;
  date: string;
  duration: number;
  playerIds: number[];
  coachId: number;
}

export interface PlayerResult {
  endurance: string;
  technique: string;
  attitude: string;
  observations: string;
}

export interface TrainingResults {
  trainingId: number;
  players: { [playerName: string]: PlayerResult };
  generalObservations: string;
  rating: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // ENTRENAMIENTOS
  createTraining(trainingData: Training): Observable<any> {
    return this.http.post(`${this.apiUrl}/coach/trainings`, trainingData, {
      headers: this.getHeaders()
    });
  }

  getCoachTrainings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coach/trainings`, {
      headers: this.getHeaders()
    });
  }

  updateTraining(trainingId: number, trainingData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/coach/trainings/${trainingId}`, trainingData, {
      headers: this.getHeaders()
    });
  }

  deleteTraining(trainingId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/coach/trainings/${trainingId}`, {
      headers: this.getHeaders()
    });
  }

  getTeamPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/coach/players`, {
      headers: this.getHeaders()
    });
  }

  getTeamStats(): Observable<TeamStats> {
    return this.http.get<TeamStats>(`${this.apiUrl}/coach/stats`, {
      headers: this.getHeaders()
    });
  }

  // RESULTADOS
  saveTrainingResults(results: TrainingResults): Observable<any> {
    console.log('💾 FRONTEND: Enviando resultados al backend');
    return this.http.post(`${this.apiUrl}/coach/training-results`, results, {
      headers: this.getHeaders()
    });
  }

  updateTrainingResults(trainingId: number, results: TrainingResults): Observable<any> {
    return this.http.put(`${this.apiUrl}/coach/training-results/${trainingId}`, results, {
      headers: this.getHeaders()
    });
  }

  getTrainingResults(trainingId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/coach/training-results/${trainingId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.log('No hay resultados previos');
        return of(null);
      })
    );
  }

  getAllTrainingResults(): Observable<any[]> {
    console.log('🔄 FRONTEND: Solicitando TODOS los resultados');
    return this.http.get<any[]>(`${this.apiUrl}/coach/training-results`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error cargando resultados:', error);
        return of([]);
      })
    );
  }

  deleteTrainingResults(trainingId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/coach/training-results/${trainingId}`, {
      headers: this.getHeaders()
    });
  }

  getPlayerTrainings(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/player/trainings`);
}

getPlayerStats(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/player/stats`);
}

getPlayerPerformance(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/player/performance`);
}

// En training.service.ts - agregar este método
getAllTrainings(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/trainings/all`);
}

}