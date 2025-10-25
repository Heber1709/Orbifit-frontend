import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Message {
  id: number;
  content: string;
  type: 'GENERAL';
  senderId: number;
  createdAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  getGeneralMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/chat/messages/general`, {
      headers: this.getHeaders()
    });
  }

  sendMessage(content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chat/messages/send`, 
      { content },
      { headers: this.getHeaders() }
    );
  }

  getTeamMembers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/team-members`, {
      headers: this.getHeaders()
    });
  }
}