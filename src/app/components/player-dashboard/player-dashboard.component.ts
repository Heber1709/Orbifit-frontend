import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { TrainingService } from '../../services/training.service';
import { ChatService } from '../../services/chat.service';
import { TournamentService, Tournament } from '../../services/tournament.service'; // 🆕 IMPORTAR

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean; // 🆕 AGREGAR PARA PUNTOS
}

interface CalendarEvent {
  id?: number;
  title: string;
  time: string;
  type: string;
  description?: string;
  originalTraining?: any;
  eventType: 'training' | 'tournament'; // 🆕 AGREGAR TIPO DE EVENTO
  originalTournament?: any; // 🆕 AGREGAR DATOS DE TORNEO
}

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-dashboard.component.html',
  styleUrls: ['./player-dashboard.component.scss']
})
export class PlayerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  userProfile: any = null;
  calendarVisible = false;
  chatVisible = false;
  currentView = 'welcome';
  loading = false;

  // Chat
  teamMembers: any[] = [];
  chatMessages: any[] = [];
  newMessage: string = '';

  // Calendario
  currentMonth: string = '';
  calendarDays: CalendarDay[] = [];
  selectedDate: Date = new Date();
  calendarEvents: { [key: string]: CalendarEvent[] } = {};
  nextEvent: any = null;

  // 🆕 VARIABLE PARA TORNEOS
  tournaments: Tournament[] = [];

  // Datos del jugador
  playerStats = {
    trainingsCompleted: 0,
    averageRating: 0,
    nextEvent: 'Por programar',
    nextEventDate: '',
    matchesPlayed: 0,
    goals: 0,
    assists: 0
  };

  trainings: any[] = [];
  playerPerformance: any = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private trainingService: TrainingService,
    private tournamentService: TournamentService, // 🆕 INYECTAR
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserProfile();
    this.loadPlayerStats();
    this.loadPlayerTrainings();
    this.loadPlayerPerformance();
    this.loadTournaments(); // 🆕 CARGAR TORNEOS
    this.generateCalendar();
  }

  // 🆕 MÉTODO PARA CARGAR TORNEOS
  loadTournaments() {
    console.log('🔄 Cargando torneos para jugador...');
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments: Tournament[]) => {
        this.tournaments = tournaments;
        console.log('✅ Torneos cargados para jugador:', tournaments.length);
        this.processTournamentsForCalendar(tournaments); // 🆕 PROCESAR TORNEOS PARA CALENDARIO
        this.generateCalendar();
        this.updateNextEvent();
      },
      error: (error: any) => {
        console.error('❌ Error cargando torneos:', error);
        this.tournaments = [];
      }
    });
  }

  // 🆕 MÉTODO PARA PROCESAR TORNEOS EN CALENDARIO
  processTournamentsForCalendar(tournaments: Tournament[]) {
    console.log('🔄 Procesando torneos para calendario del jugador:', tournaments.length);
    
    tournaments.forEach((tournament: Tournament) => {
      try {
        const startDate = new Date(tournament.startDate);
        if (isNaN(startDate.getTime())) {
          console.error('❌ Fecha inválida en torneo:', tournament);
          return;
        }
        
        const dateStr = this.formatDateForCalendar(startDate);
        
        const teamsInfo = tournament.teamsCount > 0 ? ` (${tournament.teamsCount} equipos)` : '';
        const description = tournament.description ? 
          `${tournament.description}${teamsInfo}` : 
          `Torneo${teamsInfo}`;

        const calendarEvent: CalendarEvent = {
          id: tournament.id,
          title: `🏆 ${tournament.name}`,
          time: 'Todo el día',
          type: 'TORNEO',
          description: description,
          eventType: 'tournament',
          originalTournament: tournament
        };

        if (!this.calendarEvents[dateStr]) {
          this.calendarEvents[dateStr] = [];
        }

        // Verificar duplicados antes de agregar
        const eventExists = this.calendarEvents[dateStr].some(existingEvent => 
          existingEvent.id === calendarEvent.id && 
          existingEvent.eventType === 'tournament'
        );

        if (!eventExists) {
          this.calendarEvents[dateStr].push(calendarEvent);
          console.log(`📅 Torneo agregado al calendario del jugador: ${tournament.name} en ${dateStr}`);
        }

        // Si el torneo tiene fecha de fin, agregar eventos para cada día intermedio
        if (tournament.endDate) {
          const endDate = new Date(tournament.endDate);
          if (!isNaN(endDate.getTime())) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + 1);

            while (currentDate < endDate) {
              const currentDateStr = this.formatDateForCalendar(new Date(currentDate));
              if (!this.calendarEvents[currentDateStr]) {
                this.calendarEvents[currentDateStr] = [];
              }
              
              const dayEvent = {
                ...calendarEvent,
                title: `🏆 ${tournament.name} (En curso)`,
                description: `Día ${Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} - ${description}`
              };

              const dayEventExists = this.calendarEvents[currentDateStr].some(existingEvent => 
                existingEvent.id === dayEvent.id && 
                existingEvent.eventType === 'tournament' &&
                existingEvent.title === dayEvent.title
              );

              if (!dayEventExists) {
                this.calendarEvents[currentDateStr].push(dayEvent);
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }

            // Agregar el último día también
            const endDateStr = this.formatDateForCalendar(endDate);
            if (!this.calendarEvents[endDateStr]) {
              this.calendarEvents[endDateStr] = [];
            }
            
            const finalEvent = {
              ...calendarEvent,
              title: `🏆 ${tournament.name} (Final)`,
              description: `Último día - ${description}`
            };

            const finalEventExists = this.calendarEvents[endDateStr].some(existingEvent => 
              existingEvent.id === finalEvent.id && 
              existingEvent.eventType === 'tournament' &&
              existingEvent.title === finalEvent.title
            );

            if (!finalEventExists) {
              this.calendarEvents[endDateStr].push(finalEvent);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error procesando torneo para jugador:', tournament, error);
      }
    });
    
    console.log('✅ Torneos procesados para calendario del jugador');
  }

  loadUserProfile() {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.loading = false;
        this.userProfile = this.currentUser;
      }
    });
  }

  // Métodos auxiliares para calcular porcentajes
  getEndurancePercentage(): number {
    if (!this.playerPerformance?.endurance) return 0;
    return Math.round(this.playerPerformance.endurance * 20);
  }

  getTechniquePercentage(): number {
    if (!this.playerPerformance?.technique) return 0;
    return Math.round(this.playerPerformance.technique * 20);
  }

  getAttitudePercentage(): number {
    if (!this.playerPerformance?.attitude) return 0;
    return Math.round(this.playerPerformance.attitude * 20);
  }

  getOverallPerformance(): number {
    if (!this.playerPerformance?.overall) return 0;
    return Math.round(this.playerPerformance.overall * 20);
  }

  getTotalTrainings(): number {
    return this.playerPerformance?.totalTrainings || 0;
  }

  loadPlayerStats() {
    this.trainingService.getPlayerStats().subscribe({
      next: (stats) => {
        const nextEventInfo = this.getNextEventInfo();

        this.playerStats = {
          trainingsCompleted: stats.trainingsCompleted || 0,
          averageRating: this.getOverallPerformance(),
          nextEvent: nextEventInfo.title || 'Por programar',
          nextEventDate: nextEventInfo.date || '',
          matchesPlayed: stats.matchesPlayed || 0,
          goals: stats.goals || 0,
          assists: stats.assists || 0
        };
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.playerStats = {
          trainingsCompleted: 0,
          averageRating: 0,
          nextEvent: 'Por programar',
          nextEventDate: '',
          matchesPlayed: 0,
          goals: 0,
          assists: 0
        };
      }
    });
  }

  getNextEventInfo(): { title: string, date: string } {
    if (this.nextEvent) {
      const date = new Date(this.nextEvent.fullDate);
      return {
        title: this.nextEvent.title,
        date: date.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }
    return { title: 'Por programar', date: '' };
  }

  // Métodos auxiliares para las estadísticas mensuales
  getCurrentMonthTrainings(): number {
    if (!this.trainings || this.trainings.length === 0) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this.trainings.filter(training => {
      const trainingDate = new Date(training.date);
      return trainingDate.getMonth() === currentMonth && 
             trainingDate.getFullYear() === currentYear;
    }).length;
  }

  getConsistency(): string {
    if (!this.playerPerformance) return '-';
    
    const scores = [
      this.getEndurancePercentage(),
      this.getTechniquePercentage(), 
      this.getAttitudePercentage()
    ];
    
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (average >= 85) return 'Alta';
    if (average >= 70) return 'Media';
    if (average >= 50) return 'Básica';
    return 'En desarrollo';
  }

  getImprovement(): number {
    if (!this.playerPerformance) return 0;
    return Math.round((this.playerPerformance.overall * 20) / 10);
  }

  // En el método loadPlayerTrainings
  loadPlayerTrainings() {
    this.trainingService.getPlayerTrainings().subscribe({
      next: (trainings) => {
        console.log('🏃 Entrenamientos del jugador:', trainings);
        this.trainings = trainings.map((training: any) => ({
          id: training.id,
          title: training.title,
          date: new Date(training.date),
          dateFormatted: this.formatTrainingDate(training.date),
          type: this.mapTrainingType(training.type),
          coach: `${training.coach?.firstName || 'Entrenador'} ${training.coach?.lastName || ''}`,
          status: this.getTrainingStatus(training.date),
          statusClass: this.getStatusClass(training.date),
          borderClass: this.getBorderClass(training.type),
          bgClass: this.getBgClass(training.type)
        }));

        // Procesar para calendario
        this.processTrainingsForCalendar(trainings);
        this.updateNextEvent();
        this.generateCalendar();
        
        // Actualizar estadísticas después de cargar entrenamientos
        this.loadPlayerStats();
      },
      error: (error) => {
        console.error('Error loading trainings:', error);
        this.trainings = [];
      }
    });
  }

  // 🛠️ MÉTODO ACTUALIZADO PARA PROCESAR ENTRENAMIENTOS
  processTrainingsForCalendar(trainings: any[]) {
    console.log('🔄 Procesando entrenamientos para calendario del jugador:', trainings.length);
    
    trainings.forEach(training => {
      try {
        const trainingDate = new Date(training.date);
        if (isNaN(trainingDate.getTime())) {
          console.error('❌ Fecha inválida en entrenamiento:', training);
          return;
        }
        
        const dateStr = this.formatDateForCalendar(trainingDate);
        const timeStr = trainingDate.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const calendarEvent: CalendarEvent = {
          id: training.id,
          title: training.title || `${training.type} - ${dateStr}`,
          time: timeStr,
          type: training.type,
          description: training.description,
          originalTraining: training,
          eventType: 'training'
        };

        if (!this.calendarEvents[dateStr]) {
          this.calendarEvents[dateStr] = [];
        }

        // Verificar duplicados antes de agregar
        const eventExists = this.calendarEvents[dateStr].some(existingEvent => 
          existingEvent.id === calendarEvent.id && 
          existingEvent.eventType === 'training'
        );

        if (!eventExists) {
          this.calendarEvents[dateStr].push(calendarEvent);
          console.log('📅 Evento de entrenamiento agregado al jugador:', {
            fecha: dateStr,
            hora: timeStr,
            titulo: calendarEvent.title
          });
        }
      } catch (error) {
        console.error('❌ Error procesando entrenamiento:', training, error);
      }
    });
    
    console.log('✅ Entrenamientos procesados para calendario del jugador');
  }

  loadPlayerPerformance() {
    this.trainingService.getPlayerPerformance().subscribe({
      next: (performance) => {
        this.playerPerformance = performance;
      },
      error: (error) => {
        console.error('Error loading performance:', error);
        this.playerPerformance = null;
      }
    });
  }

  calculatePlayerPerformance(results: any[]) {
    let totalEndurance = 0;
    let totalTechnique = 0;
    let totalAttitude = 0;
    let count = 0;

    results.forEach(result => {
      Object.keys(result.players).forEach(playerName => {
        if (playerName.includes(this.currentUser?.firstName || '') && 
            playerName.includes(this.currentUser?.lastName || '')) {
          const playerResult = result.players[playerName];
          totalEndurance += this.ratingToNumber(playerResult.endurance);
          totalTechnique += this.ratingToNumber(playerResult.technique);
          totalAttitude += this.ratingToNumber(playerResult.attitude);
          count++;
        }
      });
    });

    return count > 0 ? {
      endurance: totalEndurance / count,
      technique: totalTechnique / count,
      attitude: totalAttitude / count,
      overall: (totalEndurance + totalTechnique + totalAttitude) / (3 * count)
    } : null;
  }

  ratingToNumber(rating: string): number {
    const ratingMap: { [key: string]: number } = {
      'excellent': 5,
      'good': 4,
      'regular': 3,
      'needs_improvement': 2
    };
    return ratingMap[rating] || 3;
  }

  // Métodos del Chat
  loadTeamMembers() {
    this.chatService.getTeamMembers().subscribe({
      next: (members) => {
        this.teamMembers = members;
      },
      error: (error) => {
        console.error('Error cargando miembros del equipo:', error);
      }
    });
  }

  loadGeneralMessages() {
    this.chatService.getGeneralMessages().subscribe({
      next: (messages) => {
        this.chatMessages = messages;
      },
      error: (error) => {
        console.error('Error cargando mensajes generales:', error);
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.chatService.sendMessage(this.newMessage).subscribe({
      next: (message) => {
        this.chatMessages.push(message);
        this.newMessage = '';
        this.loadGeneralMessages();
      },
      error: (error) => {
        console.error('Error enviando mensaje:', error);
        alert('Error al enviar el mensaje');
      }
    });
  }

  toggleChat() {
    this.chatVisible = !this.chatVisible;
    if (this.chatVisible) {
      this.calendarVisible = false;
      this.loadGeneralMessages();
      this.loadTeamMembers();
    }
  }

  getAvatarInitials(member: any): string {
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  }

  isOwnMessage(message: any): boolean {
    return message.sender.id === this.currentUser?.id;
  }

  // Métodos del Calendario
  toggleCalendar() {
    this.calendarVisible = !this.calendarVisible;
    if (this.calendarVisible) {
      this.chatVisible = false;
      // Recargar datos si es necesario
      this.loadPlayerTrainings();
      this.loadTournaments();
    }
  }

  // 🛠️ MÉTODO CORREGIDO PARA GENERAR CALENDARIO
  generateCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    this.currentMonth = new Date(year, month, 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = this.formatDateForCalendar(date);
      const hasEvents = this.calendarEvents[dateStr] && this.calendarEvents[dateStr].length > 0;
      
      this.calendarDays.push({
        date: date,
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
        hasEvents: hasEvents // 🆕 AGREGAR INFORMACIÓN DE EVENTOS
      });
    }
    
    console.log('📅 Calendario generado para jugador:', this.currentMonth);
    console.log('📅 Días con eventos:', this.calendarDays.filter(day => day.hasEvents).length);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  // 🛠️ MÉTODO ACTUALIZADO PARA CLASES DE DÍAS
  getDayClass(day: CalendarDay): string {
    let classes = 'calendar-day ';
    
    if (!day.isCurrentMonth) {
      classes += 'other-month ';
    } else if (day.isToday) {
      classes += 'today ';
    } else if (day.isSelected) {
      classes += 'selected ';
    }
    
    // 🆕 AGREGAR CLASE SI TIENE EVENTOS
    if (day.hasEvents) {
      classes += 'has-events ';
    }
    
    return classes;
  }

  // 🛠️ MÉTODO ACTUALIZADO PARA PUNTOS DE EVENTOS
  getEventDotClass(date: Date): string {
    const events = this.getEventsForDate(date);
    if (events.length > 0) {
      const hasTournament = events.some(event => event.eventType === 'tournament');
      const hasTraining = events.some(event => event.eventType === 'training');
      
      if (hasTournament && hasTraining) return 'event-dot event-dot-mixed';
      if (hasTournament) return 'event-dot event-dot-tournament';
      if (hasTraining) return 'event-dot event-dot-training';
    }
    return '';
  }

  // 🛠️ MÉTODO ACTUALIZADO PARA CLASES DE EVENTOS
  getEventItemClass(event: CalendarEvent): string {
    const classMap: { [key: string]: string } = {
      'training': 'event-training',
      'tournament': 'event-tournament',
      'FISICO': 'event-training',
      'TACTICO': 'event-meeting',
      'TECNICO': 'event-training',
      'PRACTICA': 'event-match',
      'TORNEO': 'event-tournament'
    };
    
    // Priorizar eventType si está disponible
    if (event.eventType) {
      return 'event-item ' + (classMap[event.eventType] || 'event-training');
    }
    
    return 'event-item ' + (classMap[event.type] || 'event-training');
  }

  selectDate(day: CalendarDay) {
    this.selectedDate = day.date;
    this.generateCalendar();
  }

  // 🛠️ MÉTODO CORREGIDO PARA VERIFICAR EVENTOS
  hasEvent(date: Date): boolean {
    const dateStr = this.formatDate(date);
    const hasEvents = this.calendarEvents[dateStr] && this.calendarEvents[dateStr].length > 0;
    return hasEvents;
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = this.formatDate(date);
    return this.calendarEvents[dateStr] || [];
  }

  getDayEvents(): CalendarEvent[] {
    if (!this.selectedDate) return [];
    return this.getEventsForDate(this.selectedDate);
  }

  previousMonth() {
    const current = new Date(this.calendarDays[15].date);
    current.setMonth(current.getMonth() - 1);
    this.generateSpecificCalendar(current.getFullYear(), current.getMonth());
  }

  nextMonth() {
    const current = new Date(this.calendarDays[15].date);
    current.setMonth(current.getMonth() + 1);
    this.generateSpecificCalendar(current.getFullYear(), current.getMonth());
  }

  generateSpecificCalendar(year: number, month: number) {
    this.currentMonth = new Date(year, month, 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = this.formatDateForCalendar(date);
      const hasEvents = this.calendarEvents[dateStr] && this.calendarEvents[dateStr].length > 0;
      
      this.calendarDays.push({
        date: date,
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
        hasEvents: hasEvents
      });
    }
  }

  // Helper methods
  formatDate(date: Date): string {
    return this.formatDateForCalendar(date);
  }

  formatDateForCalendar(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTrainingDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  mapTrainingType(backendType: string): string {
    const typeMap: { [key: string]: string } = {
      'FISICO': 'Entrenamiento Físico',
      'TACTICO': 'Práctica Táctica', 
      'TECNICO': 'Trabajo Técnico',
      'PRACTICA': 'Partido de Práctica'
    };
    return typeMap[backendType] || 'Entrenamiento';
  }

  getTrainingStatus(dateString: string): string {
    const trainingDate = new Date(dateString);
    const now = new Date();
    
    if (trainingDate < now) return 'Completado';
    if (trainingDate.toDateString() === now.toDateString()) return 'Hoy';
    return 'Programado';
  }

  getStatusClass(dateString: string): string {
    const status = this.getTrainingStatus(dateString);
    const classMap: { [key: string]: string } = {
      'Completado': 'bg-gray-500',
      'Hoy': 'bg-green-500',
      'Programado': 'bg-blue-500'
    };
    return classMap[status] || 'bg-gray-500';
  }

  getBorderClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'FISICO': 'border-blue-500',
      'TACTICO': 'border-green-500',
      'TECNICO': 'border-yellow-500',
      'PRACTICA': 'border-red-500'
    };
    return classMap[type] || 'border-gray-500';
  }

  getBgClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'FISICO': 'bg-blue-50',
      'TACTICO': 'bg-green-50',
      'TECNICO': 'bg-yellow-50',
      'PRACTICA': 'bg-red-50'
    };
    return classMap[type] || 'bg-gray-50';
  }

  updateNextEvent() {
    const now = new Date();
    let nextEvent: any = null;

    Object.keys(this.calendarEvents).forEach(dateStr => {
      const events = this.calendarEvents[dateStr];
      events.forEach(event => {
        const eventDate = new Date(dateStr + 'T' + (event.time !== 'Todo el día' ? event.time : '12:00'));
        if (eventDate >= now) {
          if (!nextEvent || eventDate < new Date(nextEvent.date + 'T' + (nextEvent.time !== 'Todo el día' ? nextEvent.time : '12:00'))) {
            nextEvent = {
              ...event,
              date: dateStr,
              fullDate: eventDate
            };
          }
        }
      });
    });

    this.nextEvent = nextEvent;
  }

  formatMessageTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '--:--';
    }
  }

  // Navigation methods
  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  showPlayerProfile() {
    this.currentView = 'profile';
  }

  showTrainings() {
    this.currentView = 'trainings';
  }

  showPlayerStats() {
    this.currentView = 'stats';
  }

  showWelcome() {
    this.currentView = 'welcome';
  }

  updateProfile() {
    if (this.userProfile) {
      this.userService.updateProfile(this.userProfile).subscribe({
        next: (updatedProfile) => {
          this.userProfile = updatedProfile;
          alert('Perfil actualizado correctamente');
        },
        error: (error) => {
          alert('Error al actualizar perfil: ' + error.error?.message);
        }
      });
    }
  }
}