import { createClient, type Session, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigError = !url || !key
  ? 'La WPA no tiene configuradas VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  : null;

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

function extractFunctionError(error: unknown): string {
  // FunctionsHttpError / FunctionsRelayError exponen el cuerpo de la respuesta en `context`
  const ctx = (error as { context?: { error?: string; message?: string } }).context;
  if (ctx?.error) return ctx.error;
  if (ctx?.message) return ctx.message;
  return error instanceof Error ? error.message : 'No fue posible activar el acceso.';
}

export async function ensureFreshSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  // Renueva el access token: evita usar un JWT caducado de una sesión anterior
  // (p.ej. la sesión administrativa que quedó en localStorage del mismo origen).
  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (error || !refreshed) {
    await supabase.auth.signOut();
    return null;
  }
  return refreshed;
}

export async function consumeResidentInvitation(token: string) {
  if (!supabase) throw new Error('La PWA no tiene configuradas las variables de Supabase.');
  const { data, error } = await supabase.functions.invoke('consume-resident-invitation', { body: { token } });
  if (error) throw new Error(extractFunctionError(error));
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
