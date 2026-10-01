import { useEffect, useCallback } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { initPostHog, identifyAdmin, trackAdminEvent, trackPageView, trackTabChange, AdminEvents, flushPostHog } from '../services/posthog';

export function usePostHog() {
  const { user, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      initPostHog();
      identifyAdmin(user.id, {
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      });
    } else {
      // No hacer shutdown para mantener sesión si navega
    }
  }, [isAuthenticated, user]);

  const trackEvent = useCallback((event: string, properties?: Record<string, unknown>) => {
    trackAdminEvent(event, properties);
  }, []);

  const trackPage = useCallback((page: string, properties?: Record<string, unknown>) => {
    trackPageView(page, properties);
  }, []);

  const trackTab = useCallback((tab: string) => {
    trackTabChange(tab);
  }, []);

  const trackConjuntoAction = useCallback((action: 'created' | 'updated' | 'suspended' | 'deleted', conjuntoId: string, properties?: Record<string, unknown>) => {
    const eventMap = {
      created: AdminEvents.CONJUNTO_CREATED,
      updated: AdminEvents.CONJUNTO_UPDATED,
      suspended: AdminEvents.CONJUNTO_SUSPENDED,
      deleted: AdminEvents.CONJUNTO_DELETED,
    };
    trackAdminEvent(eventMap[action], { conjuntoId, ...properties });
  }, []);

  const trackUserAction = useCallback((action: 'role_changed' | 'suspended' | 'deleted', userId: string, properties?: Record<string, unknown>) => {
    const eventMap = {
      role_changed: AdminEvents.USER_ROLE_CHANGED,
      suspended: AdminEvents.USER_SUSPENDED,
      deleted: AdminEvents.USER_DELETED,
    };
    trackAdminEvent(eventMap[action], { userId, ...properties });
  }, []);

  const trackAgentAction = useCallback((action: 'executed' | 'chat_opened' | 'approved' | 'dismissed', agenteId: string, informeId?: string, properties?: Record<string, unknown>) => {
    const eventMap = {
      executed: AdminEvents.AGENT_ACTION_EXECUTED,
      chat_opened: AdminEvents.AGENT_CHAT_OPENED,
      approved: AdminEvents.AGENT_REPORT_APPROVED,
      dismissed: AdminEvents.AGENT_REPORT_DISMISSED,
    };
    trackAdminEvent(eventMap[action], { agenteId, informeId, ...properties });
  }, []);

  const trackDangerZone = useCallback((action: string, properties?: Record<string, unknown>) => {
    trackAdminEvent(AdminEvents.DANGER_ZONE_ACTION, { action, ...properties });
  }, []);

  const trackConfigChange = useCallback((configKey: string, oldValue: unknown, newValue: unknown) => {
    trackAdminEvent(AdminEvents.CONFIG_CHANGED, { configKey, oldValue, newValue });
  }, []);

  const flush = useCallback(() => {
    flushPostHog();
  }, []);

  return {
    trackEvent,
    trackPage,
    trackTab,
    trackConjuntoAction,
    trackUserAction,
    trackAgentAction,
    trackDangerZone,
    trackConfigChange,
    flush,
  };
}

// Hook para tracking automático de páginas
export function usePostHogPageTracking(pageName: string) {
  const { trackPage } = usePostHog();
  
  useEffect(() => {
    trackPage(pageName);
  }, [pageName, trackPage]);
}

// Hook para tracking de tabs
export function usePostHogTabTracking(tab: string) {
  const { trackTab } = usePostHog();
  
  useEffect(() => {
    trackTab(tab);
  }, [tab, trackTab]);
}