
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
