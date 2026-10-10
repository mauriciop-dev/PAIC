// PAIC — Notificaciones centralizadas (Supabase + Realtime)
// Archivo: apps/webapp/utils/notifications.ts

import { supabase } from '../services/supabaseClient'; // ajusta según tu importación real

export type NotifTipo =
  | 'comunicado' | 'reserva' | 'pqr' | 'documento'
  | 'votacion' | 'directorio' | 'porteria' | 'visitante';

export interface NotifPayload {
  conjuntoId: string;
  tipo: NotifTipo;
  titulo: string;
  cuerpo?: string;
  userId?: string; // destinatario específico; null = todos en conjunto
}

/**
 * Inserta notificación y publica en Realtime.
 * Devuelve {sent, total} para usar en mensajes de confirmación.
 */
export async function notifyPwaResidents(p: NotifPayload) {
  // 1. Insertar fila
  const { error } = await supabase.from('notifications').insert({
    conjunto_id: p.conjuntoId,
    user_id: p.userId ?? null,
    tipo: p.tipo,
    titulo: p.titulo,
    cuerpo: p.cuerpo ?? '',
    leido: false,
    creado_at: new Date().toISOString(),
  });
  if (error) throw error;

  // 2. Publicar realtime (todos los suscritos al canal reciben)
  await supabase.channel(`notifications:${p.conjuntoId}`).send({
    type: 'broadcast',
    event: 'new-notification',
    payload: { tipo: p.tipo, titulo: p.titulo, cuerpo: p.cuerpo },
  });

  // 3. Contar cuántas se envían (estimación simple si no tienes tabla de suscriptores push)
  // Si tienes tabla push_subscriptions, haz select count(*) de allí.
  return { sent: 1, total: 1 };
}

/** Leer badges de un tipo para un conjunto */
export async function getUnreadCount(conjuntoId: string, tipo: NotifTipo) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('conjunto_id', conjuntoId)
    .eq('tipo', tipo)
    .eq('leido', false);
  if (error) return 0;
  return count ?? 0;
}