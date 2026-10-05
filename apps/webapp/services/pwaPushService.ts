import { supabase } from './supabaseClient';

export type PwaPushResult = {
  sent: number;
  removed: number;
  total?: number;
  failed?: number;
  activeMembers?: number;
};

export async function notifyPwaResidents(input: { conjuntoId: string; title: string; body: string; userIds?: string[]; url?: string; dryRun?: boolean }): Promise<PwaPushResult | null> {
  const { data, error } = await supabase.functions.invoke('send-pwa-push', { body: input });
  if (error) {
    console.warn('No se pudo enviar la notificación PWA', error);
    return null;
  }
  return data as PwaPushResult;
}

export async function getPwaPushAudienceStats(conjuntoId: string): Promise<PwaPushResult | null> {
  return notifyPwaResidents({ conjuntoId, title: 'Prueba PAIC', body: 'Validación de notificaciones', dryRun: true });
}
