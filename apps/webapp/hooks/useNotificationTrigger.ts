/**
 * Hook para disparar notificaciones desde los módulos
 * Permite enviar notificaciones automáticamente al completar acciones
 */

import { useCallback } from 'react';
import { sendNotification, NotificationType } from '../services/notificationService';

export function useNotificationTrigger(conjuntoId: string) {
  
  // Enviar notificación de comunicado
  const notifyComunicado = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'comunicado',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'comunicado',
      referenciaRecurso: null
    });
  }, [conjuntoId]);

  // Enviar notificación de reserva
  const notifyReserva = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'reserva',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'reserva',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de PQR
  const notifyPQR = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'pqr',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'pqr',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de documento
  const notifyDocumento = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'documento',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'documento',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de votación
  const notifyVotacion = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'votacion',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'votacion',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de directorio
  const notifyDirectorio = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'directorio',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'directorio',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de portería
  const notifyPorteria = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'porteria',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'porteria',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de visitante
  const notifyVisitante = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'visitante',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'visitante',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  // Enviar notificación de paquete
  const notifyPaquete = useCallback(async (
    titulo: string,
    cuerpo?: string,
    userId?: string | null,
    datos?: Record<string, any>
  ) => {
    return await sendNotification({
      conjuntoId,
      tipo: 'paquete',
      titulo,
      cuerpo,
      userId,
      tipoRecurso: 'paquete',
      referenciaRecurso: datos?.id ?? null
    });
  }, [conjuntoId]);

  return {
    notifyComunicado,
    notifyReserva,
    notifyPQR,
    notifyDocumento,
    notifyVotacion,
    notifyDirectorio,
    notifyPorteria,
    notifyVisitante,
    notifyPaquete
  };
}
