/**
 * Hook para manejar notificaciones en tiempo real
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  NotificationType,
  sendNotification,
  getUnreadCount,
  markAsRead,
  subscribeToNotifications
} from '../services/notificationService';

// Types
interface NotificationItem {
  id: string;
  conjunto_id: string;
  user_id: string | null;
  tipo: NotificationType;
  titulo: string;
  cuerpo: string;
  datos: any;
  leido: boolean;
  creado_at: string;
}

export function useNotifications(conjuntoId: string, userId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<NotificationType, number>>({
    comunicado: 0,
    reserva: 0,
    pqr: 0,
    documento: 0,
    votacion: 0,
    directorio: 0,
    porteria: 0,
    visitante: 0,
    paquete: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('conjunto_id', conjuntoId)
        .eq('leido', false)
        .order('creado_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setNotifications(data || []);

      // Contar por tipo
      const counts: Record<NotificationType, number> = {
        comunicado: 0,
        reserva: 0,
        pqr: 0,
        documento: 0,
        votacion: 0,
        directorio: 0,
        porteria: 0,
        visitante: 0,
        paquete: 0
      };

      data?.forEach(notif => {
        counts[notif.tipo as NotificationType] += 1;
      });

      setUnreadCounts(counts);
      setError(null);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [conjuntoId]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!conjuntoId) return;

    // Cargar notificaciones iniciales
    loadNotifications();

    // Suscribirse a cambios
    channelRef.current = supabase
      .channel(`notifications:${conjuntoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `conjunto_id=eq.${conjuntoId}`
      }, (payload) => {
        console.log('Cambio en notificaciones:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newNotif = payload.new as NotificationItem;
          
          // Agregar a la lista
          setNotifications(prev => [newNotif, ...prev]);
          
          // Actualizar contadores
          setUnreadCounts(prev => ({
            ...prev,
            [newNotif.tipo]: (prev[newNotif.tipo] || 0) + 1
          }));

          // Mostrar notificación del navegador si está permitido
          if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(newNotif.titulo, {
                body: newNotif.cuerpo,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                data: {
                  url: newNotif.datos?.url || '/'
                }
              });
            });
          }

          // Actualizar badge de la app
          updateAppBadge();
        }

        if (payload.eventType === 'UPDATE') {
          const updatedNotif = payload.new as NotificationItem;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
          );
          
          if (updatedNotif.leido) {
            setUnreadCounts(prev => ({
              ...prev,
              [updatedNotif.tipo]: Math.max(0, (prev[updatedNotif.tipo] || 0) - 1)
            }));
          }
        }

        if (payload.eventType === 'DELETE') {
          setNotifications(prev => 
            prev.filter(n => n.id !== payload.old.id)
          );
        }
      })
      .subscribe();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conjuntoId, loadNotifications]);

  // Actualizar badge de la app
  const updateAppBadge = useCallback(async () => {
    try {
      const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
      
      if ('setAppBadge' in navigator) {
        await navigator.setAppBadge(totalUnread || 0);
      }
    } catch (error) {
      console.error('Error actualizando badge:', error);
    }
  }, [unreadCounts]);

  // Actualizar badge cuando cambien los contadores
  useEffect(() => {
    updateAppBadge();
  }, [unreadCounts, updateAppBadge]);

  // Marcar como leída
  const markAsReadCallback = useCallback(async (notificationId: string) => {
    try {
      await markAsRead([notificationId]);
      
      // Actualizar localmente
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, leido: true } : n)
      );
      
      setUnreadCounts(prev => {
        const notif = notifications.find(n => n.id === notificationId);
        if (!notif) return prev;
        
        return {
          ...prev,
          [notif.tipo]: Math.max(0, (prev[notif.tipo] || 0) - 1)
        };
      });
    } catch (error) {
      console.error('Error marcando como leída:', error);
    }
  }, [notifications]);

  // Marcar todas como leídas por tipo
  const markAllAsRead = useCallback(async (tipo?: NotificationType) => {
    try {
      const toMark = notifications.filter(n => !n.leido && (!tipo || n.tipo === tipo));
      const ids = toMark.map(n => n.id);
      
      if (ids.length === 0) return;
      
      await markAsRead(ids);
      
      // Actualizar localmente
      setNotifications(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, leido: true } : n)
      );
      
      if (tipo) {
        setUnreadCounts(prev => ({ ...prev, [tipo]: 0 }));
      } else {
        // Reset all counts
        const newCounts: Record<NotificationType, number> = {
          comunicado: 0,
          reserva: 0,
          pqr: 0,
          documento: 0,
          votacion: 0,
          directorio: 0,
          porteria: 0,
          visitante: 0,
          paquete: 0
        };
        setUnreadCounts(newCounts);
      }
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  }, [notifications]);

  // Enviar notificación
  const sendNewNotification = useCallback(async (data: {
    tipo: NotificationType;
    titulo: string;
    cuerpo?: string;
    userId?: string | null;
    datos?: Record<string, any>;
    url?: string;
  }) => {
    return await sendNotification({
      conjuntoId,
      ...data
    });
  }, [conjuntoId]);

  // Obtener contador para un tipo específico
  const getCountForType = useCallback((tipo: NotificationType) => {
    return unreadCounts[tipo] || 0;
  }, [unreadCounts]);

  return {
    notifications,
    unreadCounts,
    loading,
    error,
    markAsRead: markAsReadCallback,
    markAllAsRead,
    sendNotification: sendNewNotification,
    getCountForType,
    refresh: loadNotifications
  };
}
