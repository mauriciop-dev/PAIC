
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
}

export interface ChartData {
    name: string;
    value: number;
    fill: string;
}

export interface Resident {
    apartment: string;
    name: string;
    email: string;
    phone: string;
    status: 'Al día' | 'En mora';
    balance: number;
    overdue_installments: number;
}

export interface AccountStatus {
    apartment: string;
    lastPaymentDate: string;
    pendingInstallments: number;
    outstandingBalance: number;
}

export interface Booking {
    day: number;
    time: string;
    event: string; // e.g., 'BBQ', 'Gimnasio'
    user: string; // e.g., 'Apt 101'
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