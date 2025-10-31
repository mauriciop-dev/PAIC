export enum Tab {
  Dashboard = 'Dashboard',
  Database = 'Base de datos',
  CommonAreas = 'Áreas comunes',
  DueDates = 'Vencimientos',
  PendingTasks = 'Tareas pendientes',
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  isApiKeyRequest?: boolean;
}

export interface ChartData {
    name: string;
    value: number;
    fill: string;
}

// Actualizado según requerimientos
export interface Resident {
    apartment: string;
    name: string;
    email: string;
    phone: string;
}

// Actualizado según requerimientos
export interface AccountStatus {
    apartment: string;
    lastPaymentDate: string;
    adminFeeValue: number;
    pendingInstallments: number;
    otherCharges: number;
    outstandingBalance: number;
}

// Nuevo tipo
export interface Provider {
    id: number;
    company: string;
    specialty: string;
    email: string;
    phone: string;
}

// Nuevo tipo
export interface InternalStaff {
    id: number;
    name: string;
    position: string;
    email: string;
    phone: string;
}

export interface Booking {
    day: number;
    time: string;
    event: string; 
    user: string;
}

export interface CommonArea {
  id: string;
  name: string;
  color: { bg: string; text: string; border: string; };
}

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

export interface DueDate {
    id: number;
    item: string;
    category: 'Servicios' | 'Mantenimiento' | 'Seguros' | 'Nómina' | 'Otros';
    dueDate: string;
    status: 'Pendiente' | 'Vencido' | 'Pagado';
}

export interface Task {
    id: number;
    text: string;
    dueDate: string;
    completed: boolean;
}