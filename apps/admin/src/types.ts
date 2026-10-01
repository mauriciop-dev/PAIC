export type AdminTab = 
  | 'Dashboard'
  | 'Conjuntos'
  | 'Usuarios'
  | 'Suscripciones'
  | 'Logs'
  | 'Metricas'
  | 'Configuracion';

export interface ConjuntoAdmin {
  id: string;
  nombre: string;
  slug: string;
  plan: 'Free' | 'Trial' | 'Pro' | 'Enterprise';
  estado: 'activo' | 'suspendido' | 'pendiente' | 'expirado';
  usuariosCount: number;
  unidadesCount: number;
  createdAt: string;
  expiresAt?: string;
  adminEmail: string;
  adminName: string;
}

export interface UsuarioPlataforma {
  id: string;
  email: string;
  nombre: string;
  rol: 'superadmin' | 'admin_conjunto' | 'residente' | 'guardia' | 'contador';
  conjuntos: string[];
  ultimoAcceso: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  createdAt: string;
}

export interface MetricasPlataforma {
  totalConjuntos: number;
  conjuntosActivos: number;
  conjuntosTrial: number;
  conjuntosPro: number;
  totalUsuarios: number;
  usuariosActivosHoy: number;
  usuariosActivosMes: number;
  ingresosMRR: number;
  churnRate: number;
  alertasBugs: number;
  alertasSeguridad: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'auth' | 'payments' | 'api' | 'realtime' | 'storage' | 'functions';
  message: string;
  metadata?: Record<string, unknown>;
  conjuntoId?: string;
  userId?: string;
}

export interface AlertaBug {
  id: string;
  titulo: string;
  descripcion: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  estado: 'abierta' | 'en_progreso' | 'resuelta' | 'cerrada';
  afectados: number;
  creadoEn: string;
  actualizadoEn: string;
  asignadoA?: string;
}