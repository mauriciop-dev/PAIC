import { supabase } from './supabaseClient';

export async function notifyPwaResidents(input: { conjuntoId: string; title: string; body: string; userIds?: string[] }) {
  const { error } = await supabase.functions.invoke('send-pwa-push', { body: input });
  if (error) console.warn('No se pudo enviar la notificación PWA', error);
}
