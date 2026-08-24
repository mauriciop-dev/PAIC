// @paic/supabase - Cliente Supabase tipado para el frontend

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper para obtener el conjunto_id del usuario actual
export async function getMyConjuntoId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('conjunto_id')
    .eq('id', user.id)
    .single();
  
  if (!profile) return null;
  return (profile as { conjunto_id?: string | null }).conjunto_id ?? null;
}

// Tipos para el cliente tipado
export type SupabaseClient = ReturnType<typeof createClient<Database>>;

// Re-exportar tipos de la base de datos
export type { Database } from './types';
