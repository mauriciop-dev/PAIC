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
  userIds?: string[]; // destinatarios específicos; vacío u omitido = masivo para todo el conjunto (user_id null)
}

/**
 * Inserta notificación y publica en Realtime.
 * Devuelve {sent, total} para usar en mensajes de confirmación.
 */
export async function notifyPwaResidents(p: NotifPayload) {
  const userIds = p.userIds || [];

  if (userIds.length > 0) {
    // Una fila por destinatario específico (nada de masivo)
    const rows = userIds.map((uid) => ({
      conjunto_id: p.conjuntoId,
      user_id: uid,
      tipo: p.tipo,
      titulo: p.titulo,
      cuerpo: p.cuerpo ?? '',
      leido: false,
      creado_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;
  } else {
    // Masiva para todo el conjunto (comunicados, documentos, votaciones)
    const { error } = await supabase.from('notifications').insert({
      conjunto_id: p.conjuntoId,
      user_id: null,
      tipo: p.tipo,
      titulo: p.titulo,
      cuerpo: p.cuerpo ?? '',
      leido: false,
      creado_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  // Publicar en Realtime (los clientes filtran por user_id)
  await supabase.channel(`notifications:${p.conjuntoId}`).send({
    type: 'broadcast',
    event: 'new-notification',
    payload: { tipo: p.tipo, titulo: p.titulo, cuerpo: p.cuerpo },
  });

  return { sent: userIds.length || 1, total: userIds.length || 1 };
}

/** Leer badges de un tipo para un conjunto */
export async function getUnreadCount(conjuntoId: string, tipo: NotifTipo, userId?: string | null) {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('conjunto_id', conjuntoId)
    .eq('tipo', tipo)
    .eq('leido', false);

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export interface DueDateStatus {
  overdue: boolean;
  dueSoon: boolean;
}

export function humanizeDueDateLabel(item: string, status: DueDateStatus): string {
  const base = item || 'Pendiente';
  if (status.overdue) return `Vencido: ${base}`;
  if (status.dueSoon) return `Recordatorio: ${base}`;
  return `${base} Pendiente`;
}