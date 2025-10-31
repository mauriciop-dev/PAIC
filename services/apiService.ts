import { dataStore } from '../data/dataStore';
import { Resident, AccountStatus, Provider, InternalStaff, Booking, CommonArea, DueDate, Task, Expense, VisitorLog, PackageLog, DashboardSummary, NotificationItem, Tab } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // --- Fetching Data ---
  fetchResidents: async (): Promise<Resident[]> => {
    await delay(200);
    return dataStore.getResidents();
  },
  fetchAccountStatus: async (): Promise<AccountStatus[]> => {
    await delay(200);
    return dataStore.getAccountStatus();
  },
  fetchProviders: async (): Promise<Provider[]> => {
    await delay(200);
    return dataStore.getProviders();
  },
  fetchInternalStaff: async (): Promise<InternalStaff[]> => {
    await delay(200);
    return dataStore.getInternalStaff();
  },
  fetchDueDates: async (): Promise<DueDate[]> => {
    await delay(200);
    return dataStore.getDueDates();
  },
  fetchTasks: async (): Promise<Task[]> => {
    await delay(200);
    return dataStore.getTasks();
  },
  fetchBookings: async (): Promise<Booking[]> => {
    await delay(200);
    return dataStore.getBookings();
  },
  fetchCommonAreas: async (): Promise<CommonArea[]> => {
    await delay(200);
    return dataStore.getCommonAreas();
  },
  fetchExpenses: async (): Promise<Expense[]> => {
      await delay(200);
      return dataStore.getExpenses();
  },
  fetchVisitorLogs: async (): Promise<VisitorLog[]> => {
      await delay(200);
      return dataStore.getVisitorLogs();
  },
  fetchPackageLogs: async (): Promise<PackageLog[]> => {
      await delay(200);
      return dataStore.getPackageLogs();
  },

  fetchDashboardSummary: async (): Promise<DashboardSummary> => {
    await delay(400); // Simulate a more complex query
    const accounts = dataStore.getAccountStatus();
    const tasks = dataStore.getTasks();
    const dueDates = dataStore.getDueDates();
    const packages = dataStore.getPackageLogs();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications: NotificationItem[] = [];

    // Process due dates
    dueDates.forEach(d => {
        if (d.status === 'Vencido') {
            notifications.push({
                id: `due-${d.id}`,
                type: 'due-date',
                text: `Pago Vencido: ${d.item}`,
                details: `Venció el ${d.dueDate}.`,
                urgency: 'high',
                linkTo: Tab.DueDates
            });
        } else if (d.status === 'Pendiente') {
            const dueDate = new Date(d.dueDate);
            const timeDiff = dueDate.getTime() - today.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (dayDiff >= 0 && dayDiff <= 3) {
                 notifications.push({
                    id: `due-${d.id}`,
                    type: 'due-date',
                    text: `Pago Próximo: ${d.item}`,
                    details: `Vence en ${dayDiff} día(s).`,
                    urgency: 'medium',
                    linkTo: Tab.DueDates
                });
            }
        }
    });

    // Process tasks
    tasks.forEach(t => {
        if (!t.completed && t.dueDate) {
            const dueDate = new Date(t.dueDate);
            const timeDiff = dueDate.getTime() - today.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
             if (dayDiff < 0) {
                 notifications.push({
                    id: `task-${t.id}`,
                    type: 'task',
                    text: `Tarea Atrasada: ${t.text}`,
                    details: `Venció hace ${Math.abs(dayDiff)} día(s).`,
                    urgency: 'high',
                    linkTo: Tab.PendingTasks
                });
             } else if (dayDiff <= 3) {
                  notifications.push({
                    id: `task-${t.id}`,
                    type: 'task',
                    text: `Tarea Urgente: ${t.text}`,
                    details: `Vence en ${dayDiff} día(s).`,
                    urgency: 'medium',
                    linkTo: Tab.PendingTasks
                });
             }
        }
    });
    
    // Process packages
    packages.forEach(p => {
        if (p.status === 'En recepción') {
            notifications.push({
                id: `pkg-${p.id}`,
                type: 'package',
                text: `Paquete para Apto ${p.apartment}`,
                details: `Recibido de ${p.courier} el ${p.receivedDate}.`,
                urgency: 'low',
                linkTo: Tab.Seguridad
            });
        }
    });
    
    // Sort notifications: high -> medium -> low
    notifications.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });


    return {
        stats: {
            residentsInDebt: accounts.filter(a => a.outstandingBalance > 0).length,
            pendingTasks: tasks.filter(t => !t.completed).length,
            overduePayments: dueDates.filter(d => d.status === 'Vencido').length,
            packagesToDeliver: packages.filter(p => p.status === 'En recepción').length,
        },
        notifications: notifications.slice(0, 5) // Return top 5 most urgent notifications
    };
  },
  
  // --- Modifying Data ---
  updateResident: async (resident: Resident): Promise<void> => {
    await delay(300);
    dataStore.updateResident(resident);
  },
  addBooking: async (booking: Booking): Promise<void> => {
    await delay(300);
    dataStore.addBooking(booking);
  },
  addCommonArea: async (name: string): Promise<void> => {
    await delay(300);
    dataStore.addCommonArea(name);
  },
  removeCommonArea: async (id: string): Promise<void> => {
    await delay(300);
    dataStore.removeCommonArea(id);
  },
  
  // Tasks
  addTask: async (task: Omit<Task, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addTask(task);
  },
  updateTask: async (task: Task): Promise<void> => {
    await delay(300);
    dataStore.updateTask(task);
  },
  deleteTask: async (id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteTask(id);
  },
  
  // Due Dates
  addDueDate: async (dueDate: Omit<DueDate, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addDueDate(dueDate);
  },
  updateDueDate: async (dueDate: DueDate): Promise<void> => {
    await delay(300);
    dataStore.updateDueDate(dueDate);
  },
  deleteDueDate: async (id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteDueDate(id);
  },
  updateDueDateStatus: async (id: number, status: 'Pagado'): Promise<void> => {
    await delay(300);
    dataStore.updateDueDateStatus(id, status);
  },
  
  // Expenses
  addExpense: async (expense: Omit<Expense, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addExpense(expense);
  },
  updateExpense: async (expense: Expense): Promise<void> => {
    await delay(300);
    dataStore.updateExpense(expense);
  },
  deleteExpense: async (id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteExpense(id);
  },
  
  // --- Data Loading Simulation ---
  loadNewData: async (dataType: 'Residentes' | 'Estado de Cuentas' | 'Proveedores' | 'Internos'): Promise<void> => {
    await delay(1500); // Simulate upload and processing time
    const mapType = {
        'Residentes': 'Residents',
        'Estado de Cuentas': 'AccountStatus',
        'Proveedores': 'Providers',
        'Internos': 'InternalStaff',
    }
    dataStore.loadNewData(mapType[dataType] as any);
  },
};