import { dataStore } from '../data/dataStore';
import { Resident, AccountStatus, Provider, InternalStaff, Booking, CommonArea, DueDate, Task } from '../types';

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