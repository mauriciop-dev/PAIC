/**
 * Servicio centralizado de notificaciones PAIC
 * Maneja envío de notificaciones push y creación de badges
 */

import { supabase } from './supabaseClient';

export type NotificationType = 
  | 'comunicado' 
  | 'reserva' 
  | 'pqr' 
  | 'documento'
  | 'votacion' 
  | 'directorio' 
  | 'porteria' 
  | 'visitante'
  | 'paquete';

export interface NotificationData {
  conjuntoId: string;
  tipo: NotificationType;
  titulo: string;
  cuerpo?: string;
  userId?: string | null;
  referenciaRecurso?: string | null; // UUID del recurso relacionado
  tipoRecurso?: NotificationType | null; // Tipo de recurso relacionado
  url?: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Envía notificación a residentes y administrador
 */
export async function sendNotification(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: notif, error: insertError } = await supabase
      .from('notifications')
      .insert({
        conjunto_id: data.conjuntoId,
        user_id: data.userId || null,
        tipo: data.tipo,
        titulo: data.titulo,
        cuerpo: data.cuerpo || '',
        referencia_recurso: data.referenciaRecurso || null,
        tipo_recurso: data.tipoRecurso || null,
        leido: false,
        creado_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando notificación:', insertError);
      return { success: false, error: insertError.message };
    }

    // Publicar en canal realtime
    await supabase.channel(`notifications:${data.conjuntoId}`)
      .send({
        type: 'broadcast',
        event: 'new-notification',
        payload: {
          tipo: data.tipo,
          titulo: data.titulo,
          cuerpo: data.cuerpo,
          referenciaRecurso: data.referenciaRecurso,
          tipoRecurso: data.tipoRecurso,
          url: data.url,
          conjuntoId: data.conjuntoId,
          id: notif.id
        }
      });

    // Enviar push notification si hay suscripciones
    await sendPushNotifications(data, notif.id);

    return { success: true };
  } catch (error) {
    console.error('Error enviando notificación:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Envía notificaciones push a dispositivos suscritos
 */
async function sendPushNotifications(data: NotificationData, notificationId: string): Promise<void> {
  try {
    // Obtener suscripciones push activas
    const { data: subscriptions, error } = await supabase
      .from('pwa_push_subscriptions')
      .select('*')
      .eq('user_id', data.userId || 'all')
      .or(`user_id.is.null,user_id.eq.${data.userId}`);

    if (error || !subscriptions) return;

    // Enviar a cada suscripción
    for (const sub of subscriptions) {
      await supabase.functions.invoke('send-pwa-push', {
        body: {
          conjuntoId: data.conjuntoId,
          title: data.titulo,
          body: data.cuerpo || '',
          type: data.tipo,
          url: data.url || '/',
          id: notificationId,
          userIds: data.userId ? [data.userId] : undefined,
          subscription: sub.subscription,
          payload: {
            title: data.titulo,
            body: data.cuerpo || '',
            data: {
              notificationId,
              tipo: data.tipo,
              referenciaRecurso: data.referenciaRecurso,
              tipoRecurso: data.tipoRecurso,
              conjuntoId: data.conjuntoId,
              url: data.url || '/'
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error enviando push:', error);
  }
}

/**
 * Cuenta notificaciones no leídas por tipo
 */
export async function getUnreadCount(conjuntoId: string, tipo?: NotificationType, userId?: string | null): Promise<number> {
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('conjunto_id', conjuntoId)
      .eq('leido', false);

    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error contando notificaciones:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error contando notificaciones:', error);
    return 0;
  }
}

/**
 * Marca notificaciones como leídas
 */
export async function markAsRead(notificationIds: string[]): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ leido: true })
      .in('id', notificationIds);
  } catch (error) {
    console.error('Error marcando como leído:', error);
  }
}

/**
 * Obtiene notificaciones recientes
 */
export async function getRecentNotifications(conjuntoId: string, limit = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('conjunto_id', conjuntoId)
      .order('creado_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Suscribe dispositivo a notificaciones push
 */
export async function subscribePush(userId: string, subscription: PushSubscription): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pwa_push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription: subscription,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error guardando suscripción:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error guardando suscripción:', error);
    return false;
  }
}

/**
 * Inicia monitoreo en tiempo real de notificaciones
 */
export function subscribeToNotifications(
  conjuntoId: string,
  onNewNotification: (notification: any) => void
) {
  const channel = supabase.channel(`notifications:${conjuntoId}`);

  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `conjunto_id=eq.${conjuntoId}`
    }, (payload) => {
      onNewNotification(payload.new);
    })
    .on('broadcast', { event: 'new-notification' }, (payload) => {
      onNewNotification(payload.payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
