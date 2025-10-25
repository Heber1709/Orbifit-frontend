import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService, User, ReportData } from '../../services/admin.service';
import { TournamentService, Tournament } from '../../services/tournament.service';
import { ChatService } from '../../services/chat.service';
import { TrainingService } from '../../services/training.service';

// Cambiar el nombre de la importación para evitar conflictos
import * as PDFLib from 'jspdf';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
  eventTypes: string[];
}

interface CalendarEvent {
  id?: number;
  title: string;
  time: string;
  type: string;
  description?: string;
  eventType: 'training' | 'tournament';
  startDate?: Date;
  endDate?: Date;
  originalData?: any;
  coachName?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  currentUser: any;
  currentView: 'welcome' | 'users' | 'tournaments' | 'reports' = 'welcome';
  loading: boolean = false;
  
  calendarVisible: boolean = false;
  chatVisible: boolean = false;
  currentMonth: string = '';
  calendarDays: CalendarDay[] = [];
  selectedDate: Date = new Date();
  calendarEvents: { [key: string]: CalendarEvent[] } = {};
  
  teamMembers: any[] = [];
  chatMessages: any[] = [];
  newMessage: string = '';

  users: User[] = [];
  userSearchTerm: string = '';
  userRoleFilter: string = 'all';
  userStatusFilter: string = 'all';

  newUser = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    role: 'jugador',
    password: '',
    phone: ''
  };

  editingUser: User | null = null;

  tournaments: Tournament[] = [];
  tournamentStats = {
    totalTournaments: 0,
    activeTournaments: 0,
    scheduledTournaments: 0,
    finishedTournaments: 0
  };

  newTournament = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    teamsCount: 0
  };

  editingTournament: Tournament | null = null;

  systemStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalTrainings: 0,
    activeTournaments: 0,
    storageUsed: '0 GB',
    //systemUptime: '99.9%',
    newRegistrations: 0
  };

  reportData: ReportData | null = null;
  generatingReport: boolean = false;

  allTrainings: any[] = [];

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private tournamentService: TournamentService,
    private trainingService: TrainingService,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.currentUser.role !== 'ADMINISTRADOR') {
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('✅ Acceso autorizado a AdminDashboard');
    this.loadDashboardData();
    this.generateCalendar();
  }

  loadDashboardData() {
    this.loadSystemStats();
    this.loadUsers();
    this.loadTournaments();
    this.loadAllTrainings();
  }

  loadSystemStats() {
    this.adminService.getSystemStats().subscribe({
      next: (stats: any) => {
        this.systemStats = {
          totalUsers: stats.totalUsers,
          activeUsers: stats.totalUsers,
          totalTrainings: stats.activeTrainings,
          activeTournaments: 0,
          storageUsed: '2.3 GB',
          //systemUptime: '99.9%',
          newRegistrations: 0
        };
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas:', error);
      }
    });
  }

  loadAllTrainings() {
    console.log('🔄 Cargando todos los entrenamientos...');
    this.trainingService.getAllTrainings().subscribe({
      next: (trainings: any[]) => {
        this.allTrainings = trainings;
        console.log('✅ Todos los entrenamientos cargados:', trainings.length);
        this.loadCalendarEvents();
      },
      error: (error: any) => {
        console.error('❌ Error cargando entrenamientos:', error);
        this.allTrainings = [];
        this.loadCalendarEvents();
      }
    });
  }

  loadUsers() {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.loading = false;
        console.log('✅ Usuarios cargados:', this.users.length);
      },
      error: (error: any) => {
        this.loading = false;
        console.error('❌ Error cargando usuarios:', error);
        alert('Error al cargar usuarios: ' + error.message);
      }
    });
  }

  loadTournaments() {
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments: Tournament[]) => {
        this.tournaments = tournaments;
        console.log('✅ Torneos cargados:', this.tournaments.length);
        this.loadTournamentStats();
        this.loadCalendarEvents();
      },
      error: (error: any) => {
        console.error('❌ Error cargando torneos:', error);
      }
    });
  }

  loadTournamentStats() {
    this.tournamentService.getTournamentStats().subscribe({
      next: (stats: any) => {
        this.tournamentStats = stats;
        this.systemStats.activeTournaments = stats.activeTournaments;
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas de torneos:', error);
      }
    });
  }

  generateReports() {
    this.generatingReport = true;
    this.adminService.generateReports().subscribe({
      next: (data: ReportData) => {
        this.reportData = data;
        this.generatingReport = false;
        this.currentView = 'reports';
        console.log('📊 Reportes generados:', data);
      },
      error: (error: any) => {
        this.generatingReport = false;
        console.error('❌ Error generando reportes:', error);
        alert('Error al generar reportes: ' + error.message);
      }
    });
  }

  downloadPDF() {
    if (this.reportData) {
      this.generatePDF(this.reportData);
    }
  }

  private generatePDF(reportData: ReportData): void {
    try {
      const doc = new PDFLib.jsPDF();
      
      const primaryColor = [79, 70, 229];
      const secondaryColor = [16, 185, 129];
      
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Reporte del Sistema - Dashboard Admin', 20, 30);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${reportData.generatedAt}`, 20, 45);
      
      let yPosition = 65;
      
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('ESTADÍSTICAS DE USUARIOS', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`• Total de usuarios: ${reportData.userStats.total}`, 30, yPosition);
      yPosition += 10;
      doc.text(`• Nuevos este mes: ${reportData.userStats.newThisMonth}`, 30, yPosition);
      yPosition += 10;
      
       reportData.userStats.byRole.forEach(role => {
      doc.text(`  - ${this.getRoleName(role.role)}: ${role._count.id}`, 40, yPosition);
      yPosition += 7;
    });
      
      yPosition += 10;
      
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('ESTADÍSTICAS DE ENTRENAMIENTOS', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`• Total de entrenamientos: ${reportData.trainingStats.total}`, 30, yPosition);
      yPosition += 10;
      doc.text(`• Entrenamientos activos: ${reportData.trainingStats.active}`, 30, yPosition);
      yPosition += 10;
      
       reportData.trainingStats.byType.forEach(type => {
      doc.text(`  - ${this.getTrainingTypeName(type.type)}: ${type._count.id}`, 40, yPosition);
      yPosition += 7;
    });
      
      yPosition += 10;
      
      doc.setFontSize(16);
      doc.setTextColor(245, 158, 11);
      doc.text('ESTADÍSTICAS DEL SISTEMA', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`• Almacenamiento usado: ${reportData.systemStats.storageUsed}`, 30, yPosition);
      yPosition += 10;
      //doc.text(`• Tiempo de actividad: ${reportData.systemStats.uptime}`, 30, yPosition);
      //yPosition += 10;
      doc.text(`• Total de torneos: ${reportData.tournamentStats.total}`, 30, yPosition);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition + 10, 190, yPosition + 10);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Reporte generado automáticamente por el Sistema Orbifit', 20, 280);
      doc.text(`© ${new Date().getFullYear()} - Todos los derechos reservados`, 20, 285);
      
      const fileName = `reporte-sistema-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('✅ PDF generado exitosamente:', fileName);
    } catch (error: any) {
      console.error('❌ Error generando PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  }

  getRoleName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ADMINISTRADOR': 'Administradores',
      'ENTRENADOR': 'Entrenadores',
      'JUGADOR': 'Jugadores'
    };
    return roleMap[role] || role;
  }

  getTrainingTypeName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'FISICO': 'Entrenamiento Físico',
      'TECNICO': 'Entrenamiento Técnico',
      'TACTICO': 'Entrenamiento Táctico',
      'PRACTICA': 'Práctica'
    };
    return typeMap[type] || type;
  }

  getMonthlyTrainingData(): any[] {
    if (!this.reportData?.trainingStats?.monthly) return [];
    
    const monthlyData = this.reportData.trainingStats.monthly;
    const maxCount = Math.max(...Object.values(monthlyData) as number[]);
    
    return Object.entries(monthlyData)
      .map(([month, count]) => {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const [year, monthNum] = month.split('-');
        const monthName = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
        
        return {
          month: monthName,
          count: count as number,
          percentage: maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  loadCalendarEvents() {
    console.log('🔄 Cargando eventos del calendario...');
    
    this.calendarEvents = {};
    
    this.processTrainingsForCalendar(this.allTrainings);
    
    this.processTournamentsForCalendar(this.tournaments);
    
    console.log('📅 Eventos del calendario procesados:', Object.keys(this.calendarEvents).length, 'días con eventos');
    console.log('📊 Resumen eventos - Entrenamientos:', this.allTrainings.length, 'Torneos:', this.tournaments.length);
    
    this.generateCalendar();
  }

  processTrainingsForCalendar(trainings: any[]) {
    console.log('🔄 Procesando entrenamientos para calendario:', trainings.length);
    
    trainings.forEach((training: any) => {
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

        const coachName = training.coach ? 
          `${training.coach.firstName} ${training.coach.lastName}` : 
          'Coach no asignado';

        const calendarEvent: CalendarEvent = {
          id: training.id,
          title: `🏋️ ${training.title}`,
          time: timeStr,
          type: training.type,
          description: training.description || `Coach: ${coachName}`,
          eventType: 'training',
          startDate: trainingDate,
          originalData: training,
          coachName: coachName
        };

        if (!this.calendarEvents[dateStr]) {
          this.calendarEvents[dateStr] = [];
        }
        this.calendarEvents[dateStr].push(calendarEvent);
        
        console.log(`📅 Agregado entrenamiento: ${training.title} en ${dateStr} - Coach: ${coachName}`);
      } catch (error) {
        console.error('❌ Error procesando entrenamiento:', training, error);
      }
    });
  }

  processTournamentsForCalendar(tournaments: Tournament[]) {
    console.log('🔄 Procesando torneos para calendario:', tournaments.length);
    
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
          startDate: startDate,
          endDate: tournament.endDate ? new Date(tournament.endDate) : undefined,
          originalData: tournament
        };

        if (!this.calendarEvents[dateStr]) {
          this.calendarEvents[dateStr] = [];
        }
        this.calendarEvents[dateStr].push(calendarEvent);
        console.log(`📅 Agregado torneo: ${tournament.name} en ${dateStr}`);

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
              this.calendarEvents[currentDateStr].push({
                ...calendarEvent,
                title: `🏆 ${tournament.name} (En curso)`,
                description: `Día ${Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} - ${description}`
              });
              console.log(`📅 Agregado día intermedio de torneo: ${tournament.name} en ${currentDateStr}`);
              currentDate.setDate(currentDate.getDate() + 1);
            }

            const endDateStr = this.formatDateForCalendar(endDate);
            if (!this.calendarEvents[endDateStr]) {
              this.calendarEvents[endDateStr] = [];
            }
            this.calendarEvents[endDateStr].push({
              ...calendarEvent,
              title: `🏆 ${tournament.name} (Final)`,
              description: `Último día - ${description}`
            });
            console.log(`📅 Agregado último día de torneo: ${tournament.name} en ${endDateStr}`);
          }
        }
      } catch (error) {
        console.error('❌ Error procesando torneo:', tournament, error);
      }
    });
  }

  createTournament() {
    if (!this.newTournament.name || !this.newTournament.startDate) {
      alert('Por favor completa al menos el nombre y fecha de inicio del torneo');
      return;
    }

    this.loading = true;
    this.tournamentService.createTournament(this.newTournament).subscribe({
      next: (tournament: Tournament) => {
        this.loading = false;
        console.log('✅ Torneo creado:', tournament);
        this.loadTournaments();
        
        this.newTournament = {
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          teamsCount: 0
        };
        
        alert('¡Torneo creado exitosamente!');
      },
      error: (error: any) => {
        this.loading = false;
        console.error('❌ Error creando torneo:', error);
        alert('Error al crear torneo: ' + error.error?.message);
      }
    });
  }

  editTournament(tournament: Tournament) {
    this.editingTournament = { ...tournament };
  }

  updateTournament() {
    if (!this.editingTournament) return;

    this.loading = true;
    this.tournamentService.updateTournament(this.editingTournament.id, {
      name: this.editingTournament.name,
      description: this.editingTournament.description,
      startDate: this.editingTournament.startDate,
      endDate: this.editingTournament.endDate,
      teamsCount: this.editingTournament.teamsCount
    }).subscribe({
      next: (updatedTournament: Tournament) => {
        this.loading = false;
        console.log('✅ Torneo actualizado:', updatedTournament);
        
        const index = this.tournaments.findIndex(t => t.id === updatedTournament.id);
        if (index !== -1) {
          this.tournaments[index] = updatedTournament;
        }
        
        this.cancelTournamentEdit();
        this.loadCalendarEvents();
        alert('¡Torneo actualizado exitosamente!');
      },
      error: (error: any) => {
        this.loading = false;
        console.error('❌ Error actualizando torneo:', error);
        alert('Error al actualizar torneo: ' + error.error?.message);
      }
    });
  }

  deleteTournament(tournamentId: number) {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (tournament && confirm(`¿Estás seguro de eliminar el torneo "${tournament.name}"?`)) {
      this.loading = true;
      this.tournamentService.deleteTournament(tournamentId).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.tournaments = this.tournaments.filter(t => t.id !== tournamentId);
          this.loadTournamentStats();
          this.loadCalendarEvents();
          alert('✅ Torneo eliminado correctamente');
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Error eliminando torneo:', error);
          alert('Error al eliminar torneo: ' + error.error?.message);
        }
      });
    }
  }

  cancelTournamentEdit() {
    this.editingTournament = null;
  }

  deleteTraining(trainingId: number) {
    const training = this.allTrainings.find(t => t.id === trainingId);
    if (training && confirm(`¿Estás seguro de eliminar el entrenamiento "${training.title}"?`)) {
      this.loading = true;
      this.trainingService.deleteTraining(trainingId).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.allTrainings = this.allTrainings.filter(t => t.id !== trainingId);
          this.loadCalendarEvents();
          alert('✅ Entrenamiento eliminado correctamente');
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Error eliminando entrenamiento:', error);
          alert('Error al eliminar entrenamiento: ' + error.error?.message);
        }
      });
    }
  }

  toggleCalendar() {
    this.calendarVisible = !this.calendarVisible;
    if (this.calendarVisible) {
      this.chatVisible = false;
      this.loadAllTrainings();
      this.loadCalendarEvents();
    }
  }

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
      const eventsForDay = this.calendarEvents[dateStr] || [];
      const eventTypes = [...new Set(eventsForDay.map(event => event.eventType))];
      
      this.calendarDays.push({
        date: date,
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
        hasEvents: eventsForDay.length > 0,
        eventTypes: eventTypes
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

  selectDate(day: CalendarDay) {
    this.selectedDate = day.date;
    this.generateCalendar();
    console.log('📅 Fecha seleccionada:', this.selectedDate);
    console.log('📅 Eventos para esta fecha:', this.getDayEvents().length);
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
    
    if (day.hasEvents) {
      classes += 'has-events ';
    }
    
    return classes;
  }

  hasEvent(date: Date): boolean {
    const dateStr = this.formatDateForCalendar(date);
    return this.calendarEvents[dateStr] && this.calendarEvents[dateStr].length > 0;
  }

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

  getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = this.formatDateForCalendar(date);
    return this.calendarEvents[dateStr] || [];
  }

  getDayEvents(): CalendarEvent[] {
    if (!this.selectedDate) return [];
    const events = this.getEventsForDate(this.selectedDate);
    console.log('📅 Eventos para día seleccionado:', events.length);
    return events;
  }

  getEventItemClass(event: CalendarEvent): string {
    const classMap: { [key: string]: string } = {
      'training': 'event-item event-training',
      'tournament': 'event-item event-tournament',
      'FISICO': 'event-item event-training',
      'TACTICO': 'event-item event-meeting',
      'TECNICO': 'event-item event-training',
      'PRACTICA': 'event-item event-match',
      'TORNEO': 'event-item event-tournament'
    };
    
    if (event.eventType) {
      return classMap[event.eventType] || 'event-item event-training';
    }
    
    return classMap[event.type] || 'event-item event-training';
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
      const eventsForDay = this.calendarEvents[dateStr] || [];
      const eventTypes = [...new Set(eventsForDay.map(event => event.eventType))];
      
      this.calendarDays.push({
        date: date,
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
        hasEvents: eventsForDay.length > 0,
        eventTypes: eventTypes
      });
    }
    
    console.log('📅 Calendario específico generado para:', this.currentMonth);
  }

  formatDateForCalendar(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  createUser() {
    if (!this.newUser.firstName || !this.newUser.lastName || !this.newUser.email || !this.newUser.password) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    this.loading = true;
    this.adminService.createUser(this.newUser).subscribe({
      next: (user: User) => {
        this.loading = false;
        console.log('✅ Usuario creado:', user);
        this.loadUsers();
        this.loadSystemStats();
        
        this.newUser = {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          role: 'jugador',
          password: '',
          phone: ''
        };
        
        alert('¡Usuario creado exitosamente!');
      },
      error: (error: any) => {
        this.loading = false;
        console.error('❌ Error creando usuario:', error);
        alert('Error al crear usuario: ' + error.error?.message);
      }
    });
  }

  editUser(user: User) {
    this.editingUser = { ...user };
  }

  updateUser() {
    if (!this.editingUser) return;

    this.loading = true;
    this.adminService.updateUser(this.editingUser.id, {
      firstName: this.editingUser.firstName,
      lastName: this.editingUser.lastName,
      email: this.editingUser.email,
      role: this.editingUser.role,
      phone: this.editingUser.phone
    }).subscribe({
      next: (updatedUser: User) => {
        this.loading = false;
        console.log('✅ Usuario actualizado:', updatedUser);
        
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        
        this.cancelEdit();
        alert('¡Usuario actualizado exitosamente!');
      },
      error: (error: any) => {
        this.loading = false;
        console.error('❌ Error actualizando usuario:', error);
        alert('Error al actualizar usuario: ' + error.error?.message);
      }
    });
  }

  deleteUser(userId: number) {
    const user = this.users.find(u => u.id === userId);
    if (user && confirm(`¿Estás seguro de DESACTIVAR a ${user.firstName} ${user.lastName}?\n\nEl usuario será marcado como INACTIVO y no podrá acceder al sistema, pero se mantendrán todos sus datos históricos.`)) {
      this.loading = true;
      this.adminService.deleteUser(userId).subscribe({
        next: (response: any) => {
          this.loading = false;
          console.log('✅ Usuario desactivado:', response);
          
          const index = this.users.findIndex(u => u.id === userId);
          if (index !== -1) {
            this.users[index] = {
              ...this.users[index],
              status: 'inactive',
              email: response.email,
              username: response.username
            };
          }
          
          alert('✅ ' + (response.message || 'Usuario desactivado correctamente. Ya no podrá acceder al sistema.'));
        },
        error: (error: any) => {
          this.loading = false;
          console.error('❌ Error desactivando usuario:', error);
          this.loadUsers();
          alert('Error al desactivar usuario: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  cancelEdit() {
    this.editingUser = null;
  }

  get filteredUsers() {
    return this.users.filter(user => {
      const matchesSearch = `${user.firstName} ${user.lastName} ${user.email} ${user.username}`
        .toLowerCase()
        .includes(this.userSearchTerm.toLowerCase());
      
      const matchesRole = this.userRoleFilter === 'all' || user.role === this.userRoleFilter;
      
      const matchesStatus = this.userStatusFilter === 'all' || 
                          (this.userStatusFilter === 'active' && user.status === 'active') ||
                          (this.userStatusFilter === 'inactive' && user.status === 'inactive');
      
      return matchesSearch && matchesRole && matchesStatus;
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

  loadTeamMembers() {
    this.chatService.getTeamMembers().subscribe({
      next: (members: any[]) => {
        this.teamMembers = members;
      },
      error: (error: any) => {
        console.error('Error cargando miembros:', error);
        this.teamMembers = [];
      }
    });
  }

  loadGeneralMessages() {
    this.chatService.getGeneralMessages().subscribe({
      next: (messages: any[]) => {
        this.chatMessages = messages;
      },
      error: (error: any) => {
        console.error('Error cargando mensajes:', error);
        this.chatMessages = [];
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      alert('Por favor escribe un mensaje');
      return;
    }

    this.chatService.sendMessage(this.newMessage).subscribe({
      next: (message: any) => {
        this.chatMessages.push(message);
        this.newMessage = '';
      },
      error: (error: any) => {
        console.error('Error enviando mensaje:', error);
        alert('Error al enviar mensaje');
      }
    });
  }

  getAvatarInitials(member: any): string {
    if (!member || !member.firstName || !member.lastName) return '??';
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  }

  isOwnMessage(message: any): boolean {
    return message.sender.id === this.currentUser.id;
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

  showWelcome() { 
    this.currentView = 'welcome'; 
  }
  showUsers() { 
    this.currentView = 'users'; 
    this.loadUsers();
  }
  showTournaments() { 
    this.currentView = 'tournaments'; 
    this.loadTournaments();
  }
  showReports() { this.currentView = 'reports'; }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRoleBadgeClass(role: string): string {
    const classMap: { [key: string]: string } = {
      'administrador': 'bg-purple-100 text-purple-800',
      'entrenador': 'bg-green-100 text-green-800',
      'jugador': 'bg-blue-100 text-blue-800'
    };
    return classMap[role] || 'bg-gray-100 text-gray-800';
  }

  getStatusBadgeClass(status: string): string {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  getTournamentStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'ACTIVO': 'bg-green-100 text-green-800',
      'PROGRAMADO': 'bg-yellow-100 text-yellow-800', 
      'FINALIZADO': 'bg-gray-100 text-gray-800'
    };
    return classMap[status] + ' px-2 py-1 rounded-full text-xs font-medium';
  }

  getTournamentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'ACTIVO': 'Activo',
      'PROGRAMADO': 'Programado',
      'FINALIZADO': 'Finalizado'
    };
    return statusMap[status] || status;
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  getCurrentDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }
}