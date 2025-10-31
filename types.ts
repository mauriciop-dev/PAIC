// FIX: Manually define `import.meta.env` to resolve TypeScript errors since
// the `vite/client` types are not being found automatically. This replaces the
// failing triple-slash directive.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_GEMINI_API_KEY?: string;
      readonly VITE_GOOGLE_CLIENT_ID?: string;
    };
  }
}

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