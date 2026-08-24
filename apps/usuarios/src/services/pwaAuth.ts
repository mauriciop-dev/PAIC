import { createClient, type Session, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;

export interface PwaMembership {
  id: string;
  user_id: string;
  conjunto_id: string;
  apartment: string;
  role: 'residente_principal' | 'residente_secundario' | 'propietario_no_residente';
  status: 'pendiente' | 'activo' | 'inactivo';
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('La WPA no tiene configuradas las variables de Supabase.');
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
}

export async function consumeResidentInvitation(token: string) {
  if (!supabase) throw new Error('La PWA no tiene configuradas las variables de Supabase.');
  const { data, error } = await supabase.functions.invoke('consume-resident-invitation', { body: { token } });
  if (error) throw error;
  return data as { ok: boolean; membership: PwaMembership };
}

export async function getMembership(user: User): Promise<PwaMembership | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pwa_memberships')
    .select('id, user_id, conjunto_id, apartment, role, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data as PwaMembership | null;
}

export async function requestMembership(input: { userId: string; conjuntoId: string; apartment: string; role: PwaMembership['role'] }) {
  if (!supabase) throw new Error('La WPA no tiene configuradas las variables de Supabase.');
  const { data, error } = await supabase
    .from('pwa_memberships')
    .insert({ user_id: input.userId, conjunto_id: input.conjuntoId, apartment: input.apartment.trim(), role: input.role, status: 'pendiente' })
    .select('id, user_id, conjunto_id, apartment, role, status')
    .single();
  if (error) throw error;
  return data as PwaMembership;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
