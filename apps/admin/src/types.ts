export type AdminTab = 
  | 'Dashboard'
  | 'Agentes'
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

// ============================================
// TIPOS PARA AGENTES INTELIGENTES (Fase 2)
// ============================================

export type AgenteId = 'sentinel' | 'debug' | 'wald' | 'behavioral';

export type Severidad = 'critica' | 'alta' | 'media' | 'baja';

export type EstadoInforme = 'pendiente' | 'en_progreso' | 'aprobado' | 'resuelto' | 'descartado';

export type CategoriaInforme = 
  | 'seguridad' 
  | 'excepcion_frontend' 
  | 'excepcion_backend' 
  | 'memory_leak' 
  | 'churn_silencioso' 
  | 'flujo_truncado' 
  | 'patron_uso' 
  | 'adopcion_pwa' 
  | 'optimizacion_ux';

export interface Agente {
  id: AgenteId;
  nombre: string;
  icono: string;
  color: 'red' | 'orange' | 'blue' | 'green' | 'purple';
  descripcion: string;
  estado: 'activo' | 'pausado' | 'error';
  ultimaEjecucion: string;
  proximaEjecucion: string;
  metricas: Record<string, number>;
}

export interface AccionSugerida {
  tipo: string;
  descripcion: string;
  payload: Record<string, unknown>;
}

export interface InformeAgente {
  id: string;
  agenteId: AgenteId;
  titulo: string;
  descripcion: string;
  severidad: Severidad;
  categoria: CategoriaInforme;
  estado: EstadoInforme;
  creadoEn: string;
  actualizadoEn?: string;
  metadata: Record<string, unknown>;
  accionSugerida?: AccionSugerida;
}

export interface AccionAgente {
  id: string;
  label: string;
  icono: string;
  color: 'red' | 'orange' | 'blue' | 'green' | 'purple';
  requiereConfirmacion: boolean;
}

export interface ChatMensaje {
  id: string;
  agenteId: AgenteId;
  remitente: 'superadmin' | 'agente';
  contenido: string;
  timestamp: string;
}