
import { dataStore } from '../data/dataStore';
import { Resident, AccountStatus, Provider, InternalStaff, Booking, CommonArea, DueDate, Task, Expense, VisitorLog, PackageLog, DashboardSummary, NotificationItem, Tab, PlatformUser, AccessPoint, ConjuntoInfo, SuperAdminProfile, UserRole } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // --- Super Admin ---
  authenticateSuperAdmin: async (email: string, pass: string): Promise<SuperAdminProfile | null> => {
      await delay(500);
      const admin = dataStore.authenticateSuperAdmin(email, pass);
      if (admin) {
          return { ...admin, name: 'Mauricio Pineda' }; // Name is static for now
      }
      return null;
  },
  fetchAllConjuntos: async (): Promise<ConjuntoInfo[]> => {
      await delay(300);
      return dataStore.getAllConjuntos();
  },
  fetchConjuntoInfo: async (id: string): Promise<ConjuntoInfo | null> => {
      await delay(100);
      return dataStore.getConjuntoInfo(id);
  },
  updateConjuntoInfo: async (info: ConjuntoInfo): Promise<void> => {
      await delay(400); // Simulate saving
      dataStore.updateConjuntoInfo(info);
  },

  // --- Auth & User Management ---
  authenticateUser: async (email: string, pass: string): Promise<PlatformUser | null> => {
      await delay(500);
      return dataStore.authenticateUser(email, pass);
  },
  findUserByEmail: async (email: string): Promise<PlatformUser | null> => {
      await delay(200);
      return dataStore.findUserByEmail(email);
  },
  fetchUsers: async (conjuntoId: string): Promise<PlatformUser[]> => {
      await delay(200);
      return dataStore.getUsers(conjuntoId);
  },
  addUser: async (conjuntoId: string, user: Omit<PlatformUser, 'id' | 'conjuntoId'>): Promise<void> => {
      await delay(300);
      dataStore.addUser(conjuntoId, user);
  },
  updateUser: async (user: PlatformUser): Promise<void> => {
      await delay(300);
      dataStore.updateUser(user);
  },
  deleteUser: async (userId: number): Promise<void> => {
      await delay(300);
      dataStore.deleteUser(userId);
  },
  
  // --- Access Point Management ---
  fetchAccessPoints: async (conjuntoId: string): Promise<AccessPoint[]> => {
      await delay(200);
      return dataStore.getAccessPoints(conjuntoId);
  },
  addAccessPoint: async (conjuntoId: string, name: string): Promise<void> => {
      await delay(300);
      dataStore.addAccessPoint(conjuntoId, name);
  },
  deleteAccessPoint: async (conjuntoId: string, id: number): Promise<void> => {
      await delay(300);
      dataStore.deleteAccessPoint(conjuntoId, id);
  },

  // --- Fetching Data (Tenant-Aware) ---
  fetchResidents: async (conjuntoId: string): Promise<Resident[]> => {
    await delay(200);
    return dataStore.getResidents(conjuntoId);
  },
  fetchAccountStatus: async (conjuntoId: string): Promise<AccountStatus[]> => {
    await delay(200);
    return dataStore.getAccountStatus(conjuntoId);
  },
  fetchProviders: async (conjuntoId: string): Promise<Provider[]> => {
    await delay(200);
    return dataStore.getProviders(conjuntoId);
  },
  fetchInternalStaff: async (conjuntoId: string): Promise<InternalStaff[]> => {
    await delay(200);
    return dataStore.getInternalStaff(conjuntoId);
  },
  fetchDueDates: async (conjuntoId: string): Promise<DueDate[]> => {
    await delay(200);
    return dataStore.getDueDates(conjuntoId);
  },
  fetchTasks: async (conjuntoId: string): Promise<Task[]> => {
    await delay(200);
    return dataStore.getTasks(conjuntoId);
  },
  fetchBookings: async (conjuntoId: string): Promise<Booking[]> => {
    await delay(200);
    return dataStore.getBookings(conjuntoId);
  },
  fetchCommonAreas: async (conjuntoId: string): Promise<CommonArea[]> => {
    await delay(200);
    return dataStore.getCommonAreas(conjuntoId);
  },
  fetchExpenses: async (conjuntoId: string): Promise<Expense[]> => {
      await delay(200);
      return dataStore.getExpenses(conjuntoId);
  },
  fetchVisitorLogs: async (conjuntoId: string): Promise<VisitorLog[]> => {
      await delay(200);
      return dataStore.getVisitorLogs(conjuntoId);
  },
  fetchPackageLogs: async (conjuntoId: string): Promise<PackageLog[]> => {
      await delay(200);
      return dataStore.getPackageLogs(conjuntoId);
  },

  fetchDashboardSummary: async (conjuntoId: string): Promise<DashboardSummary> => {
    await delay(400); // Simulate a more complex query
    const accounts = dataStore.getAccountStatus(conjuntoId);
    const tasks = dataStore.getTasks(conjuntoId);
    const dueDates = dataStore.getDueDates(conjuntoId);
    const packages = dataStore.getPackageLogs(conjuntoId);
    
    // ... (rest of the logic is the same)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notifications: NotificationItem[] = [];
    dueDates.forEach(d => {
        if (d.status === 'Vencido') notifications.push({ id: `due-${d.id}`, type: 'due-date', text: `Pago Vencido: ${d.item}`, details: `Venció el ${d.dueDate}.`, urgency: 'high', linkTo: Tab.DueDates });
        else if (d.status === 'Pendiente') {
            const dayDiff = Math.ceil((new Date(d.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (dayDiff >= 0 && dayDiff <= 3) notifications.push({ id: `due-${d.id}`, type: 'due-date', text: `Pago Próximo: ${d.item}`, details: `Vence en ${dayDiff} día(s).`, urgency: 'medium', linkTo: Tab.DueDates });
        }
    });
    tasks.forEach(t => {
        if (!t.completed && t.dueDate) {
            const dayDiff = Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (dayDiff < 0) notifications.push({ id: `task-${t.id}`, type: 'task', text: `Tarea Atrasada: ${t.text}`, details: `Venció hace ${Math.abs(dayDiff)} día(s).`, urgency: 'high', linkTo: Tab.PendingTasks });
            else if (dayDiff <= 3) notifications.push({ id: `task-${t.id}`, type: 'task', text: `Tarea Urgente: ${t.text}`, details: `Vence en ${dayDiff} día(s).`, urgency: 'medium', linkTo: Tab.PendingTasks });
        }
    });
    packages.forEach(p => {
        if (p.status === 'En recepción') notifications.push({ id: `pkg-${p.id}`, type: 'package', text: `Paquete para Apto ${p.apartment}`, details: `Recibido de ${p.courier} el ${p.receivedDate}.`, urgency: 'low', linkTo: Tab.Seguridad });
    });
    notifications.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.urgency] - order[b.urgency];
    });

    return {
        stats: {
            residentsInDebt: accounts.filter(a => a.outstandingBalance > 0).length,
            pendingTasks: tasks.filter(t => !t.completed).length,
            overduePayments: dueDates.filter(d => d.status === 'Vencido').length,
            packagesToDeliver: packages.filter(p => p.status === 'En recepción').length,
        },
        notifications: notifications.slice(0, 5)
    };
  },
  
  // --- Modifying Data (Tenant-Aware) ---
  updateResident: async (conjuntoId: string, resident: Resident): Promise<void> => {
    await delay(300);
    dataStore.updateResident(conjuntoId, resident);
  },
  deleteResident: async (conjuntoId: string, apartment: string): Promise<void> => {
    await delay(300);
    dataStore.deleteResident(conjuntoId, apartment);
  },
  addBooking: async (conjuntoId: string, booking: Booking): Promise<void> => {
    await delay(300);
    dataStore.addBooking(conjuntoId, booking);
  },
  addCommonArea: async (conjuntoId: string, name: string): Promise<void> => {
    await delay(300);
    dataStore.addCommonArea(conjuntoId, name);
  },
  removeCommonArea: async (conjuntoId: string, id: string): Promise<void> => {
    await delay(300);
    dataStore.removeCommonArea(conjuntoId, id);
  },
  
  addTask: async (conjuntoId: string, task: Omit<Task, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addTask(conjuntoId, task);
  },
  updateTask: async (conjuntoId: string, task: Task): Promise<void> => {
    await delay(300);
    dataStore.updateTask(conjuntoId, task);
  },
  deleteTask: async (conjuntoId: string, id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteTask(conjuntoId, id);
  },
  
  addDueDate: async (conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addDueDate(conjuntoId, dueDate);
  },
  updateDueDate: async (conjuntoId: string, dueDate: DueDate): Promise<void> => {
    await delay(300);
    dataStore.updateDueDate(conjuntoId, dueDate);
  },
  deleteDueDate: async (conjuntoId: string, id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteDueDate(conjuntoId, id);
  },
  
  addExpense: async (conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> => {
    await delay(300);
    dataStore.addExpense(conjuntoId, expense);
  },
  updateExpense: async (conjuntoId: string, expense: Expense): Promise<void> => {
    await delay(300);
    dataStore.updateExpense(conjuntoId, expense);
  },
  deleteExpense: async (conjuntoId: string, id: number): Promise<void> => {
    await delay(300);
    dataStore.deleteExpense(conjuntoId, id);
  },
};
