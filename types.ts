export enum Tab {
  Dashboard = 'Dashboard',
  Database = 'Base de datos',
  CommonAreas = 'Áreas comunes',
  Comunicaciones = 'Comunicaciones',
  Finanzas = 'Finanzas',
  Seguridad = 'Seguridad',
  DueDates = 'Vencimientos',
  PendingTasks = 'Tareas pendientes',
}

export enum UserRole {
  Admin = 'Administrador',
  Guard = 'Portero',
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface AccessPoint {
  id: number;
  name: string;
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
    // Added for dual bar charts
    ingresos?: number;
    gastos?: number;
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
    picture?: string;
    phone?: string;
    role: UserRole;
}

// Nuevo tipo para la configuración inicial
export interface ConjuntoInfo {
    name: string;
    nit: string;
    address: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
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

// Nuevo tipo para la sección de Finanzas
export type ExpenseCategory = 'Servicios' | 'Mantenimiento' | 'Nómina' | 'Administrativos' | 'Otros';
export interface Expense {
    id: number;
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    providerId?: number;
}

// Nuevos tipos para el Módulo de Seguridad
export interface VisitorLog {
    id: number;
    apartment: string;
    visitorName: string;
    date: string;
    status: 'Autorizado' | 'Ingresó' | 'Salió';
    entryTime?: string;
    exitTime?: string;
}

export interface PackageLog {
    id: number;
    apartment: string;
    courier: string;
    trackingNumber?: string;
    receivedDate: string;
    status: 'En recepción' | 'Entregado';
}

// Nuevos tipos para Dashboard View
export interface NotificationItem {
    id: number | string;
    type: 'due-date' | 'task' | 'package';
    text: string;
    details: string;
    urgency: 'high' | 'medium' | 'low';
    linkTo: Tab;
}

export interface DashboardSummary {
    stats: {
        residentsInDebt: number;
        pendingTasks: number;
        overduePayments: number;
        packagesToDeliver: number;
    };
    notifications: NotificationItem[];
}
