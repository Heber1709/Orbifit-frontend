import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TrainingService, TrainingResults, PlayerResult } from '../../services/training.service';
import { ChatService } from '../../services/chat.service';
import { TournamentService, Tournament } from '../../services/tournament.service';

type ViewType = 'welcome' | 'profile' | 'schedule' | 'record' | 'teamstats';

interface CoachProfile {
  fullName: string;
  email: string;
  specialization: string;  
  experienceYears: number; 
  license: string;
  phone: string;
}

interface TrainingForm {
  type: string;
  date: string;
  time: string;
  duration: number;
  description: string;
}

interface Player {
  id: number;
  name: string;
  position: string;
  jerseyNumber?: number;
  age?: number;
  selected: boolean;
}

interface TeamStats {
  activePlayers: number;
  trainings: number;
  matchesPlayed: number;
  wins: number;
  playerPerformance: any[];
  trainingTypes: any[];
  totalTrainingTime: number;
  averageRating: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean; // 🆕 AGREGAR PARA CONTROLAR PUNTOS
}

interface CalendarEvent {
  id?: number;
  title: string;
  time: string;
  type: string;
  description?: string;
  originalTraining?: any;
  eventType: 'training' | 'tournament';
  originalTournament?: any;
}

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.scss']
})
export class CoachDashboardComponent implements OnInit {
  currentUser: any;
  currentView: ViewType = 'welcome';
  loading: boolean = false;
  
  calendarVisible: boolean = false;
  chatVisible: boolean = false;
  
  currentMonth: string = '';
  calendarDays: CalendarDay[] = [];
  selectedDate: Date = new Date();
  
  coachProfile: CoachProfile = {
    fullName: '',
    email: '',
    specialization: '',
    experienceYears: 0,
    license: '',
    phone: ''
  };

  newTraining: TrainingForm = {
    type: 'Entrenamiento Físico',
    date: '',
    time: '',
    duration: 90,
    description: ''
  };

  teamPlayers: Player[] = [];
  teamStats: TeamStats = {
    activePlayers: 0,
    trainings: 0,
    matchesPlayed: 0,
    wins: 0,
    playerPerformance: [],
    trainingTypes: [],
    totalTrainingTime: 0,
    averageRating: 0
  };

  allPlayersSelected: boolean = true;

  calendarEvents: { [key: string]: CalendarEvent[] } = {};
  editingTrainingId: number | null = null;
  isEditMode: boolean = false;

  selectedTrainingForResults: any = null;
  trainingResults: TrainingResults = {
    trainingId: 0,
    players: {},
    generalObservations: '',
    rating: 0
  };
  availableTrainings: any[] = [];
  savedResults: any[] = [];

  nextEvent: any = null;

  // VARIABLES PARA TORNEOS
  tournaments: Tournament[] = [];
  tournamentStats = {
    totalTournaments: 0,
    activeTournaments: 0,
    scheduledTournaments: 0,
    finishedTournaments: 0
  };

  // Chat - Solo general
  teamMembers: any[] = [];
  chatMessages: any[] = [];
  newMessage: string = '';

  constructor(
    private authService: AuthService,
    public trainingService: TrainingService,
    private tournamentService: TournamentService,
    private router: Router,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadUserProfile();
    this.loadTeamPlayers();
    this.loadTeamStats();
    
    // 🛠️ CORREGIDO: Inicializar calendario limpio
    this.calendarEvents = {};
    this.generateCalendar();
    
    // Cargar datos en orden
    this.loadTrainingsFromDatabase();
    this.loadTournaments();
    this.updateNextEvent();
    this.loadTeamMembers();
  }

  // 🛠️ MÉTODO CORREGIDO PARA CARGAR EVENTOS DEL CALENDARIO
  loadCalendarData() {
    console.log('🔄 Cargando datos del calendario...');
    
    // Limpiar eventos existentes
    this.calendarEvents = {};
    
    // Procesar entrenamientos
    this.processTrainingsForCalendar(this.availableTrainings);
    
    // Procesar torneos
    this.processTournamentsForCalendar(this.tournaments);
    
    console.log('📅 Eventos totales en calendario:', this.getTotalEventsCount());
    this.generateCalendar();
    this.updateNextEvent();
  }

  // 🛠️ MÉTODO PARA CONTAR EVENTOS TOTALES
  getTotalEventsCount(): number {
    let count = 0;
    Object.keys(this.calendarEvents).forEach(dateStr => {
      count += this.calendarEvents[dateStr].length;
    });
    return count;
  }

  loadUserProfile() {
    this.loading = true;
    this.authService.loadUserProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.coachProfile = {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          specialization: user.specialization || 'Entrenamiento Físico',
          experienceYears: user.experienceYears || 0,
          license: user.license || '',
          phone: user.phone || ''
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        this.coachProfile = {
          fullName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
          email: this.currentUser.email,
          specialization: this.currentUser.specialization || 'Entrenamiento Físico',
          experienceYears: this.currentUser.experienceYears || 0,
          license: this.currentUser.license || '',
          phone: this.currentUser.phone || ''
        };
        this.loading = false;
      }
    });
  }

  // MÉTODO CORREGIDO PARA CARGAR TORNEOS
  loadTournaments() {
    console.log('🔄 Cargando torneos para coach...');
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments: Tournament[]) => {
        this.tournaments = tournaments;
        console.log('✅ Torneos cargados para coach:', tournaments.length);
        this.loadTournamentStats();
        
        // 🛠️ CORREGIDO: Procesar torneos y actualizar calendario
        this.processTournamentsForCalendar(tournaments);
        this.generateCalendar();
      },
      error: (error: any) => {
        console.error('❌ Error cargando torneos:', error);
        this.tournaments = [];
      }
    });
  }

  loadTournamentStats() {
    this.tournamentService.getTournamentStats().subscribe({
      next: (stats: any) => {
        this.tournamentStats = stats;
        console.log('📊 Estadísticas de torneos cargadas:', stats);
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas de torneos:', error);
      }
    });
  }

  loadTeamPlayers() {
    this.loading = true;
    this.trainingService.getTeamPlayers().subscribe({
      next: (players) => {
        this.teamPlayers = players.map((player: any) => ({
          ...player,
          selected: true
        }));
        this.allPlayersSelected = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando jugadores:', error);
        this.loading = false;
      }
    });
  }

  loadTeamStats() {
    this.trainingService.getTeamStats().subscribe({
      next: (stats) => {
        this.teamStats = {
          ...stats,
          ...this.calculateAdvancedStats()
        };
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.teamStats = {
          activePlayers: 0,
          trainings: 0,
          matchesPlayed: 0,
          wins: 0,
          playerPerformance: [],
          trainingTypes: [],
          totalTrainingTime: 0,
          averageRating: 0
        };
      }
    });
  }

  calculateAdvancedStats() {
    const trainingTypes: any = {};
    let totalTrainingTime = 0;

    this.availableTrainings.forEach(training => {
      const type = this.reverseMapTrainingType(training.type);
      trainingTypes[type] = (trainingTypes[type] || 0) + 1;
      totalTrainingTime += training.duration || 0;
    });

    const playerPerformance = this.calculatePlayerPerformance();

    return {
      playerPerformance,
      trainingTypes: Object.keys(trainingTypes).map(type => ({
        type,
        count: trainingTypes[type],
        percentage: this.availableTrainings.length > 0 ? Math.round((trainingTypes[type] / this.availableTrainings.length) * 100) : 0
      })),
      totalTrainingTime,
      averageRating: 0
    };
  }

  loadResultsForStats() {
    this.trainingService.getAllTrainingResults().subscribe({
      next: (results) => {
        console.log('📊 Resultados cargados para estadísticas:', results.length);
        this.savedResults = results;
        this.loadTeamStats();
      },
      error: (error) => {
        console.error('Error cargando resultados para estadísticas:', error);
        this.savedResults = [];
      }
    });
  }

  calculatePlayerPerformance() {
    const playerStats: any = {};

    this.savedResults.forEach(result => {
      if (result.players) {
        Object.keys(result.players).forEach(playerName => {
          if (!playerStats[playerName]) {
            playerStats[playerName] = {
              name: playerName,
              totalScore: 0,
              evaluations: 0,
              position: this.getPlayerPosition(playerName)
            };
          }

          const playerResult = result.players[playerName];
          const score = this.calculatePlayerScore(playerResult);
          playerStats[playerName].totalScore += score;
          playerStats[playerName].evaluations++;
        });
      }
    });

    return Object.values(playerStats)
      .map((player: any) => ({
        ...player,
        performance: player.evaluations > 0 ? Math.round((player.totalScore / player.evaluations) * 10) / 10 : 0,
        trend: 'up'
      }))
      .sort((a: any, b: any) => b.performance - a.performance)
      .slice(0, 5);
  }

  calculatePlayerScore(playerResult: PlayerResult): number {
    let score = 0;
    const ratingValues: { [key: string]: number } = {
      'excellent': 5,
      'good': 4,
      'regular': 3,
      'needs_improvement': 2
    };

    if (playerResult.endurance) score += ratingValues[playerResult.endurance] || 3;
    if (playerResult.technique) score += ratingValues[playerResult.technique] || 3;
    if (playerResult.attitude) score += ratingValues[playerResult.attitude] || 3;

    return score / 3;
  }

  // 🛠️ MÉTODO CORREGIDO PARA CARGAR ENTRENAMIENTOS
  loadTrainingsFromDatabase() {
    this.loading = true;
    
    this.trainingService.getCoachTrainings().subscribe({
      next: (trainings: any[]) => {
        console.log('✅ Entrenamientos cargados:', trainings.length);
        this.availableTrainings = trainings;
        
        // 🛠️ CORREGIDO: Procesar entrenamientos y actualizar calendario
        this.processTrainingsForCalendar(trainings);
        this.generateCalendar();
        
        this.loading = false;
        this.updateNextEvent();
        this.loadTeamStats();
      },
      error: (error) => {
        console.error('❌ Error cargando entrenamientos:', error);
        this.loading = false;
        this.generateCalendar();
      }
    });
  }

  // 🛠️ MÉTODO CORREGIDO PARA PROCESAR ENTRENAMIENTOS
  processTrainingsForCalendar(trainings: any[]) {
    console.log('🔄 Procesando entrenamientos para calendario:', trainings.length);
    
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

        // 🛠️ VERIFICAR DUPLICADOS ANTES DE AGREGAR
        const eventExists = this.calendarEvents[dateStr].some(existingEvent => 
          existingEvent.id === calendarEvent.id && 
          existingEvent.eventType === 'training'
        );

        if (!eventExists) {
          this.calendarEvents[dateStr].push(calendarEvent);
          console.log('📅 Evento de entrenamiento agregado:', {
            fecha: dateStr,
            hora: timeStr,
            titulo: calendarEvent.title
          });
        } else {
          console.log('⚠️ Evento de entrenamiento duplicado, omitiendo:', calendarEvent.title);
        }
      } catch (error) {
        console.error('❌ Error procesando entrenamiento:', training, error);
      }
    });
    
    console.log('✅ Entrenamientos procesados para calendario');
  }

  // 🛠️ MÉTODO CORREGIDO PARA PROCESAR TORNEOS
  processTournamentsForCalendar(tournaments: Tournament[]) {
    console.log('🔄 Procesando torneos para calendario del coach:', tournaments.length);
    
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

        // 🛠️ VERIFICAR DUPLICADOS ANTES DE AGREGAR
        const eventExists = this.calendarEvents[dateStr].some(existingEvent => 
          existingEvent.id === calendarEvent.id && 
          existingEvent.eventType === 'tournament'
        );

        if (!eventExists) {
          this.calendarEvents[dateStr].push(calendarEvent);
          console.log(`📅 Torneo agregado al calendario: ${tournament.name} en ${dateStr}`);
        } else {
          console.log('⚠️ Torneo duplicado, omitiendo:', tournament.name);
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
        console.error('❌ Error procesando torneo para coach:', tournament, error);
      }
    });
    
    console.log('✅ Torneos procesados para calendario del coach');
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

  formatDate(date: Date): string {
    return this.formatDateForCalendar(date);
  }

  showWelcome() {
    this.currentView = 'welcome';
    this.isEditMode = false;
    this.editingTrainingId = null;
    this.resetTrainingForm();
  }

  showCoachProfile() {
    this.currentView = 'profile';
  }

  showScheduleTraining() {
    this.currentView = 'schedule';
  }

  showRecordResults() {
    this.currentView = 'record';
    this.loadAvailableTrainings();
  }

  showTeamStats() {
    this.currentView = 'teamstats';
    this.loadResultsForStats();
  }

  toggleCalendar() {
    this.calendarVisible = !this.calendarVisible;
    if (this.calendarVisible) {
      this.chatVisible = false;
      // 🛠️ CORREGIDO: Recargar datos sin duplicar
      this.loadCalendarData();
    }
  }

  toggleChat() {
    this.chatVisible = !this.chatVisible;
    if (this.chatVisible) {
      this.calendarVisible = false;
      console.log('💬 Abriendo chat...');
      this.loadGeneralMessages();
      this.loadTeamMembers();
    }
  }

  updateCoachProfile() {
    this.loading = true;
    
    const profileData = {
      specialization: this.coachProfile.specialization,  
      experienceYears: this.coachProfile.experienceYears, 
      license: this.coachProfile.license,
      phone: this.coachProfile.phone
    };

    this.authService.updateUserProfile(profileData).subscribe({
      next: (updatedUser) => {
        this.loading = false;
        this.coachProfile = {
          fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
          email: updatedUser.email,
          specialization: updatedUser.specialization || 'Entrenamiento Físico',
          experienceYears: updatedUser.experienceYears || 0,
          license: updatedUser.license || '',
          phone: updatedUser.phone || ''
        };
        alert('Perfil actualizado correctamente');
      },
      error: (error) => {
        this.loading = false;
        console.error('Error actualizando perfil:', error);
        alert('Error al actualizar el perfil');
      }
    });
  }

  getSelectedPlayersCount(): number {
    return this.teamPlayers.filter(player => player.selected).length;
  }

  toggleSelectAll(select: boolean) {
    this.allPlayersSelected = select;
    this.teamPlayers.forEach(player => player.selected = select);
  }

  createTraining() {
    const selectedPlayers = this.teamPlayers
      .filter(player => player.selected)
      .map(player => player.id);
    
    if (!this.newTraining.date || !this.newTraining.time) {
      alert('Por favor completa la fecha y hora del entrenamiento');
      return;
    }

    if (selectedPlayers.length === 0) {
      alert('Selecciona al menos un jugador para el entrenamiento');
      return;
    }

    const localDate = new Date(this.newTraining.date + 'T' + this.newTraining.time);
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));

    const trainingData = {
      title: `${this.newTraining.type} - ${this.newTraining.date}`,
      description: this.newTraining.description,
      type: this.mapTrainingType(this.newTraining.type),
      date: utcDate.toISOString(),
      duration: parseInt(this.newTraining.duration.toString()),
      playerIds: selectedPlayers,
      coachId: this.currentUser.id
    };

    console.log('📅 Fecha del entrenamiento:', {
      fechaLocal: this.newTraining.date,
      hora: this.newTraining.time,
      fechaUTC: utcDate.toISOString(),
      fechaParaCalendario: this.formatDateForCalendar(utcDate)
    });

    this.loading = true;

    if (this.isEditMode && this.editingTrainingId) {
      this.trainingService.updateTraining(this.editingTrainingId, trainingData).subscribe({
        next: (response) => {
          this.loading = false;
          console.log('✅ Entrenamiento actualizado:', response);
          this.loadTrainingsFromDatabase();
          this.loadAvailableTrainings();
          alert('¡Entrenamiento actualizado exitosamente!');
          this.showWelcome();
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error actualizando entrenamiento:', error);
          alert('Error al actualizar el entrenamiento: ' + error.message);
        }
      });
    } else {
      this.trainingService.createTraining(trainingData).subscribe({
        next: (response) => {
          this.loading = false;
          console.log('✅ Entrenamiento creado:', response);
          this.loadTrainingsFromDatabase();
          this.loadAvailableTrainings();
          alert('¡Entrenamiento programado exitosamente!');
          this.showWelcome();
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error creando entrenamiento:', error);
          alert('Error al programar el entrenamiento: ' + error.message);
        }
      });
    }
  }

  formatDateForCalendar(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapTrainingType(frontendType: string): string {
    const typeMap: { [key: string]: string } = {
      'Entrenamiento Físico': 'FISICO',
      'Práctica Táctica': 'TACTICO', 
      'Trabajo Técnico': 'TECNICO',
      'Partido de Práctica': 'PRACTICA'
    };
    return typeMap[frontendType] || 'FISICO';
  }

  editTraining(event: any, index: number) {
    console.log('✏️ Editando entrenamiento:', event);
    
    if (event.originalTraining) {
      this.loadTrainingForEdit(event.originalTraining);
    }
  }

  loadTrainingForEdit(training: any) {
    this.isEditMode = true;
    this.editingTrainingId = training.id;
    
    const trainingDate = new Date(training.date);
    
    this.newTraining = {
      type: this.reverseMapTrainingType(training.type),
      date: trainingDate.toISOString().split('T')[0],
      time: trainingDate.toTimeString().slice(0, 5),
      duration: training.duration,
      description: training.description || ''
    };

    this.teamPlayers.forEach(player => player.selected = true);
    
    this.showScheduleTraining();
  }

  reverseMapTrainingType(backendType: string): string {
    const typeMap: { [key: string]: string } = {
      'FISICO': 'Entrenamiento Físico',
      'TACTICO': 'Práctica Táctica', 
      'TECNICO': 'Trabajo Técnico',
      'PRACTICA': 'Partido de Práctica'
    };
    return typeMap[backendType] || 'Entrenamiento Físico';
  }

  deleteTraining(event: any, index: number) {
    console.log('🗑️ Eliminando entrenamiento:', event);
    
    if (confirm(`¿Eliminar "${event.title}"?`)) {
      if (event.id) {
        this.loading = true;
        this.trainingService.deleteTraining(event.id).subscribe({
          next: (response) => {
            this.loading = false;
            this.loadTrainingsFromDatabase();
            alert('✅ Eliminado correctamente');
          },
          error: (error) => {
            this.loading = false;
            console.error('❌ Error eliminando:', error);
            alert('Error al eliminar');
          }
        });
      }
    }
  }

  resetTrainingForm() {
    this.newTraining = {
      type: 'Entrenamiento Físico',
      date: '',
      time: '',
      duration: 90,
      description: ''
    };
    this.isEditMode = false;
    this.editingTrainingId = null;
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
    
    console.log('📅 Calendario generado para:', this.currentMonth);
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

  // 🛠️ MÉTODO CORREGIDO PARA PUNTOS DE EVENTOS
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
    console.log(`🔍 Verificando eventos para ${dateStr}:`, hasEvents);
    return hasEvents;
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = this.formatDate(date);
    const events = this.calendarEvents[dateStr] || [];
    console.log(`📅 Eventos para ${dateStr}:`, events.length);
    return events;
  }

  getDayEvents(): CalendarEvent[] {
    if (!this.selectedDate) return [];
    const events = this.getEventsForDate(this.selectedDate);
    console.log(`📋 Eventos del día seleccionado:`, events.length);
    return events;
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

  loadAvailableTrainings() {
    this.loading = true;
    this.trainingService.getCoachTrainings().subscribe({
      next: (trainings) => {
        this.availableTrainings = trainings;
        this.loading = false;
        console.log('✅ Entrenamientos disponibles actualizados:', this.availableTrainings.length);
      },
      error: (error) => {
        console.error('Error cargando entrenamientos:', error);
        this.loading = false;
      }
    });
  }

  selectTrainingForResults(training: any) {
    console.log('🎯 Seleccionando entrenamiento para resultados:', training.id);
    
    this.selectedTrainingForResults = training;
    this.trainingResults.trainingId = training.id;
    
    this.initializePlayerResults(training);
    this.loadExistingResults(training.id);
  }

  initializePlayerResults(training: any) {
    console.log('👥 Inicializando jugadores del entrenamiento');
    
    this.trainingResults.players = {};

    if (training.participants && training.participants.length > 0) {
      training.participants.forEach((participant: any) => {
        const playerName = `${participant.player.firstName} ${participant.player.lastName}`;
        this.trainingResults.players[playerName] = {
          endurance: 'good',
          technique: 'good', 
          attitude: 'good',
          observations: ''
        };
      });
    }
    
    console.log(`✅ ${Object.keys(this.trainingResults.players).length} jugadores inicializados`);
  }

  loadExistingResults(trainingId: number) {
    console.log('📥 Cargando resultados existentes para:', trainingId);
    
    this.trainingService.getTrainingResults(trainingId).subscribe({
      next: (results) => {
        if (results && results.players) {
          console.log('✅ Resultados existentes encontrados');
          
          Object.keys(results.players).forEach(playerName => {
            if (this.trainingResults.players[playerName]) {
              this.trainingResults.players[playerName] = {
                ...this.trainingResults.players[playerName],
                ...results.players[playerName]
              };
            }
          });
          
          this.trainingResults.generalObservations = results.generalObservations || '';
          this.trainingResults.rating = results.rating || 0;
        } else {
          console.log('ℹ️ No hay resultados previos');
        }
      },
      error: (error) => {
        console.log('ℹ️ No hay resultados previos o error:', error);
      }
    });
  }

  saveTrainingResults() {
    if (!this.selectedTrainingForResults) {
      alert('Por favor selecciona un entrenamiento primero');
      return;
    }

    console.log('💾 Guardando resultados...');

    this.loading = true;
    this.trainingService.saveTrainingResults(this.trainingResults).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('✅ Resultados guardados:', response);
        alert('¡Resultados guardados exitosamente!');
        
        this.clearResultsForm();
        this.loadResultsForStats();
        this.showWelcome();
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error guardando resultados:', error);
        alert('Error al guardar los resultados: ' + error.message);
      }
    });
  }

  updateTrainingResults() {
    if (!this.selectedTrainingForResults) {
      alert('Por favor selecciona un entrenamiento primero');
      return;
    }

    console.log('🔄 Actualizando resultados...');

    this.loading = true;
    this.trainingService.updateTrainingResults(this.trainingResults.trainingId, this.trainingResults).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('✅ Resultados actualizados:', response);
        alert('¡Resultados actualizados exitosamente!');
        
        this.clearResultsForm();
        this.loadResultsForStats();
        this.showWelcome();
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error actualizando resultados:', error);
        alert('Error al actualizar los resultados: ' + error.message);
      }
    });
  }

  deleteTrainingResults(trainingId: number) {
    if (confirm('¿Estás seguro de que quieres eliminar estos resultados?')) {
      console.log('🗑️ Eliminando resultados:', trainingId);
      
      this.loading = true;
      this.trainingService.deleteTrainingResults(trainingId).subscribe({
        next: (response) => {
          this.loading = false;
          console.log('✅ Resultados eliminados:', response);
          
          this.loadAvailableTrainings();
          this.clearResultsForm();
          this.loadResultsForStats();
          alert('¡Resultados eliminados exitosamente!');
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error eliminando resultados:', error);
          alert('Error al eliminar los resultados: ' + error.message);
        }
      });
    }
  }

  getPlayerNames(): string[] {
    return Object.keys(this.trainingResults.players);
  }

  getPlayerPosition(playerName: string): string {
    const player = this.teamPlayers.find(p => p.name === playerName);
    return player?.position || 'Sin posición';
  }

  getRatingButtonClass(rating: number): string {
    if (rating <= this.trainingResults.rating) {
      const colorClasses = {
        1: 'bg-red-500 hover:bg-red-600',
        2: 'bg-orange-500 hover:bg-orange-600', 
        3: 'bg-yellow-500 hover:bg-yellow-600',
        4: 'bg-green-500 hover:bg-green-600',
        5: 'bg-blue-500 hover:bg-blue-600'
      };
      return colorClasses[rating as keyof typeof colorClasses] || 'bg-gray-500';
    }
    return 'bg-gray-300 text-gray-600 hover:bg-gray-400';
  }

  clearResultsForm() {
    this.selectedTrainingForResults = null;
    this.trainingResults = {
      trainingId: 0,
      players: {},
      generalObservations: '',
      rating: 0
    };
  }

  hasExistingResults(): boolean {
    return this.savedResults.some(result => result.trainingId === this.trainingResults.trainingId);
  }

  getTrainingTitle(trainingId: number): string {
    const training = this.availableTrainings.find(t => t.id === trainingId);
    return training?.title || `Entrenamiento #${trainingId}`;
  }

  setPlayerRating(playerName: string, category: keyof PlayerResult, value: string) {
    if (!this.trainingResults.players[playerName]) {
      this.trainingResults.players[playerName] = {
        endurance: 'good',
        technique: 'good',
        attitude: 'good',
        observations: ''
      };
    }
    this.trainingResults.players[playerName][category] = value;
  }

  setTrainingRating(rating: number) {
    this.trainingResults.rating = rating;
  }

  onPlayerRatingChange(playerName: string, category: keyof PlayerResult, event: Event) {
    const target = event.target as HTMLSelectElement;
    this.setPlayerRating(playerName, category, target.value);
  }

  onPlayerObservationsChange(playerName: string, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!this.trainingResults.players[playerName]) {
      this.trainingResults.players[playerName] = {
        endurance: 'good',
        technique: 'good',
        attitude: 'good',
        observations: ''
      };
    }
    this.trainingResults.players[playerName].observations = target.value;
  }

  getPerformanceColor(performance: number): string {
    if (performance >= 4.5) return 'text-green-600';
    if (performance >= 4.0) return 'text-green-500';
    if (performance >= 3.5) return 'text-yellow-500';
    if (performance >= 3.0) return 'text-orange-500';
    return 'text-red-500';
  }

  getTrendIcon(trend: string): string {
    return trend === 'up' ? '📈' : '📉';
  }

  getPerformanceClass(performance: number): string {
    const level = Math.floor(performance * 20);
    const roundedLevel = Math.floor(level / 10) * 10;
    return `performance-${roundedLevel}`;
  }

  getPerformanceWidth(performance: number): number {
    return (performance / 5) * 100;
  }

  getRatingPercentage(rating: number): number {
    if (this.savedResults.length === 0) return 0;
    
    const ratings = this.savedResults.map(result => result.rating || 0);
    const count = ratings.filter(r => Math.round(r) === rating).length;
    return Math.round((count / ratings.length) * 100);
  }

  formatEventDate(dateStr: string, timeStr: string): string {
    const date = new Date(dateStr + 'T' + timeStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Chat Methods - Solo general
  loadTeamMembers() {
    this.chatService.getTeamMembers().subscribe({
      next: (members) => {
        console.log('👥 Miembros del equipo cargados:', members);
        this.teamMembers = members;
      },
      error: (error) => {
        console.error('Error cargando miembros del equipo:', error);
        this.teamMembers = [];
      }
    });
  }

  loadGeneralMessages() {
    console.log('📥 Cargando mensajes...');
    this.chatService.getGeneralMessages().subscribe({
      next: (messages) => {
        console.log('💬 Mensajes cargados:', messages);
        this.chatMessages = messages;
      },
      error: (error) => {
        console.error('Error cargando mensajes generales:', error);
        this.chatMessages = [];
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      alert('Por favor escribe un mensaje');
      return;
    }

    console.log('📤 Enviando mensaje:', this.newMessage);

    this.chatService.sendMessage(this.newMessage).subscribe({
      next: (message) => {
        console.log('✅ Mensaje enviado:', message);
        this.chatMessages.push(message);
        this.newMessage = '';
        
        // Forzar actualización de la vista
        this.chatMessages = [...this.chatMessages];
      },
      error: (error) => {
        console.error('❌ Error enviando mensaje:', error);
        alert('Error al enviar el mensaje: ' + error.message);
      }
    });
  }

  getAvatarInitials(member: any): string {
    if (!member || !member.firstName || !member.lastName) return '??';
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  }

  isOwnMessage(message: any): boolean {
    const isOwn = message.sender.id === this.currentUser.id;
    console.log('🔍 Verificando mensaje:', {
      messageSender: message.sender.id,
      currentUser: this.currentUser.id,
      isOwn: isOwn,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      currentUserName: `${this.currentUser.firstName} ${this.currentUser.lastName}`
    });
    return isOwn;
  }

  onMessageKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}