// @paic/types - Tipos compartidos de PAIC

export enum Tab {
  Dashboard = 'Centro de Control',
  Database = 'Base de datos',
  CommonAreas = 'Áreas comunes',
  Comunicaciones = 'Comunicaciones',
  Archivos = 'Archivos',
  Finanzas = 'Finanzas',
  Seguridad = 'Seguridad',
  DueDates = 'Vencimientos',
  PendingTasks = 'Tareas pendientes',
  PWA = 'PWA residentes',
}

export enum UserRole {
  Trial = 'trial',
  Subscriber = 'subscriber',
  Internal = 'internal',
  Admin = 'admin',
}

export interface UserRoleDefinition {
  id: string;
  name: string;
  permissions: Tab[];
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole | string;
  password?: string;
  pin?: string;
  accessPointId?: number;
  conjuntoId: string;
}

export interface AccessPoint {
  id: number;
  name: string;
  email?: string;
  password?: string;
  usuarioId?: string;
}

export interface ActiveShift {
  guardName: string;
  isEmergency: boolean;
  noveltyNote?: string;
  startedAt: string;
  accessPointId?: number;
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  isApiKeyRequest?: boolean;
}

export interface ChartData {
  name: string;
  value?: number;
  fill?: string;
  ingresos?: number;
  gastos?: number;
  [key: string]: any;
}

export interface Resident {
  apartment: string;
  name: string;
  email: string;
  phone: string;
}

export interface AccountStatus {
  apartment: string;
  lastPaymentDate: string;
  adminFeeValue: number;
  pendingInstallments: number;
  otherCharges: number;
  outstandingBalance: number;
}

export interface Provider {
  id: number;
  company: string;
  specialty: string;
  email: string;
  phone: string;
}

export interface InternalStaff {
  name: string;
  position: string;
  email: string;
  phone: string;
  pin?: string;
  hashed_pin?: string;
}

export interface Reservation {
  id: number;
  apartment: string;
  residentName: string;
  commonAreaId: string;
  date: string;
  startTime: string;
  endTime: string;
  email: string;
  phone: string;
}

export interface CommonArea {
  id: string;
  name: string;
  color: { bg: string; text: string; border: string; };
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  trialExpiresAt?: string;
  conjuntoId?: string;
  permissions?: Tab[];
  onboardingCompleted?: boolean;
}

export interface SuperAdminProfile {
  name: string;
  email: string;
  role: UserRole.Admin;
}

export interface ConjuntoInfo {
  id: string;
  name: string;
  nit: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  subscriptionPlan: 'Free' | 'Paid';
  planName?: string;
  planPrice?: number;
  preapprovalId?: string;
  planExpiresAt?: string | null;
  lastPaymentId?: string;
  registrationDate?: string;
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

export enum ExpenseCategory {
  Servicios = 'Servicios',
  Mantenimiento = 'Mantenimiento',
  Nomina = 'Nómina',
  Administrativos = 'Administrativos',
  Otros = 'Otros',
}
export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  providerId?: number | null;
}

export enum IncomeCategory {
  CuotaAdmin = 'Cuota de Administración',
  Multas = 'Multas',
  AlquilerAreas = 'Alquiler de Áreas',
  Otros = 'Otros',
}
export interface Income {
  id: number;
  description: string;
  amount: number;
  category: IncomeCategory;
  date: string;
}

export interface VisitorLog {
  id: number;
  apartment: string;
  visitorName: string;
  date: string;
  status: 'Autorizado' | 'Ingresó' | 'Salió';
  entryTime?: string;
  exitTime?: string;
  conjuntoId?: string;
  accessPointId?: number;
}

export interface PackageLog {
  id: number;
  apartment: string;
  courier: string;
  trackingNumber?: string;
  receivedDate: string;
  status: 'En recepción' | 'Entregado';
  conjuntoId?: string;
}

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
    residentsInDebt: { count: number; details: string[] };
    pendingTasks: { count: number; details: string[] };
    overduePayments: { count: number; details: string[] };
    packagesToDeliver: { count: number; details: string[] };
  };
  notifications: NotificationItem[];
}

export interface PlatformStats {
  totalConjuntos: number;
  paidSubscriptions: number;
  totalResidents: number;
  monthlyRecurringRevenue: number;
  newThisMonth: number;
}

export interface SuperAdminChartData {
  chatbotUsage: ChartData[];
  packageVolume: ChartData[];
  visitorTraffic: ChartData[];
}

export interface StoredFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}
