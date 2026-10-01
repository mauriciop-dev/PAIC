import posthog from 'posthog-js';

let posthogInitialized = false;

export function initPostHog() {
  if (posthogInitialized || typeof window === 'undefined') return;
  
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  
  if (!apiKey) {
    console.warn('[PostHog] VITE_POSTHOG_KEY no configurado. Telemetría deshabilitada.');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    autocapture: false, // Control manual para admin
    capture_pageview: false,
    persistence: 'localStorage',
    loaded: (ph) => {
      console.log('[PostHog] Inicializado correctamente');
    },
  });
  
  posthogInitialized = true;
}

export function identifyAdmin(userId: string, properties: Record<string, unknown> = {}) {
  if (!posthogInitialized) return;
  posthog.identify(userId, {
    role: 'superadmin',
    platform: 'admin',
    ...properties,
  });
}

export function trackAdminEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!posthogInitialized) return;
  posthog.capture(event, {
    platform: 'admin',
    timestamp: new Date().toISOString(),
    ...properties,
  });
}

// Eventos específicos del Admin
export const AdminEvents = {
  // Navegación
  PAGE_VIEW: 'admin_page_view',
  TAB_CHANGE: 'admin_tab_change',
  
  // Conjuntos
  CONJUNTO_CREATED: 'admin_conjunto_created',
  CONJUNTO_UPDATED: 'admin_conjunto_updated',
  CONJUNTO_SUSPENDED: 'admin_conjunto_suspended',
  CONJUNTO_DELETED: 'admin_conjunto_deleted',
  
  // Usuarios
  USER_ROLE_CHANGED: 'admin_user_role_changed',
  USER_SUSPENDED: 'admin_user_suspended',
  USER_DELETED: 'admin_user_deleted',
  
  // Suscripciones
  PLAN_CHANGED: 'admin_plan_changed',
  SUBSCRIPTION_RENEWED: 'admin_subscription_renewed',
  PAYMENT_RETRY: 'admin_payment_retry',
  
  // Agentes
  AGENT_ACTION_EXECUTED: 'admin_agent_action_executed',
  AGENT_CHAT_OPENED: 'admin_agent_chat_opened',
  AGENT_REPORT_APPROVED: 'admin_agent_report_approved',
  AGENT_REPORT_DISMISSED: 'admin_agent_report_dismissed',
  
  // Configuración (Zona Peligro)
  CONFIG_CHANGED: 'admin_config_changed',
  DANGER_ZONE_ACTION: 'admin_danger_zone_action',
  MAINTENANCE_TOGGLED: 'admin_maintenance_toggled',
  
  // Logs
  LOGS_FILTER_CHANGED: 'admin_logs_filter_changed',
  LOG_EXPORTED: 'admin_log_exported',
  
  // Métricas
  METRICS_REFRESHED: 'admin_metrics_refreshed',
  REPORT_GENERATED: 'admin_report_generated',
} as const;

export function trackPageView(page: string, properties: Record<string, unknown> = {}) {
  trackAdminEvent(AdminEvents.PAGE_VIEW, { page, ...properties });
}

export function trackTabChange(tab: string) {
  trackAdminEvent(AdminEvents.TAB_CHANGE, { tab });
}

export function trackConjuntoAction(action: 'created' | 'updated' | 'suspended' | 'deleted', conjuntoId: string, properties: Record<string, unknown> = {}) {
  const eventMap = {
    created: AdminEvents.CONJUNTO_CREATED,
    updated: AdminEvents.CONJUNTO_UPDATED,
    suspended: AdminEvents.CONJUNTO_SUSPENDED,
    deleted: AdminEvents.CONJUNTO_DELETED,
  };
  trackAdminEvent(eventMap[action], { conjuntoId, ...properties });
}

export function trackUserAction(action: 'role_changed' | 'suspended' | 'deleted', userId: string, properties: Record<string, unknown> = {}) {
  const eventMap = {
    role_changed: AdminEvents.USER_ROLE_CHANGED,
    suspended: AdminEvents.USER_SUSPENDED,
    deleted: AdminEvents.USER_DELETED,
  };
  trackAdminEvent(eventMap[action], { userId, ...properties });
}

export function trackAgentAction(action: 'executed' | 'chat_opened' | 'approved' | 'dismissed', agenteId: string, informeId?: string, properties: Record<string, unknown> = {}) {
  const eventMap = {
    executed: AdminEvents.AGENT_ACTION_EXECUTED,
    chat_opened: AdminEvents.AGENT_CHAT_OPENED,
    approved: AdminEvents.AGENT_REPORT_APPROVED,
    dismissed: AdminEvents.AGENT_REPORT_DISMISSED,
  };
  trackAdminEvent(eventMap[action], { agenteId, informeId, ...properties });
}

export function trackDangerZoneAction(action: string, properties: Record<string, unknown> = {}) {
  trackAdminEvent(AdminEvents.DANGER_ZONE_ACTION, { action, ...properties });
}

export function trackConfigChange(configKey: string, oldValue: unknown, newValue: unknown) {
  trackAdminEvent(AdminEvents.CONFIG_CHANGED, { configKey, oldValue, newValue });
}

export function flushPostHog() {
  if (posthogInitialized) {
    posthog.flush();
  }
}

export function shutdownPostHog() {
  if (posthogInitialized) {
    posthog.shutdown();
    posthogInitialized = false;
  }
}