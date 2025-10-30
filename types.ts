
export enum Tab {
  Dashboard = 'Dashboard',
  Database = 'Base de datos',
  CommonAreas = 'Áreas comunes',
  DueDates = 'Vencimientos',
  PendingTasks = 'Tareas pendientes',
  Status = 'Estado',
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