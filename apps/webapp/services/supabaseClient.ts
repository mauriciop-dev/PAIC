import { supabase as typedSupabase } from '@paic/supabase/client';

// El servicio legacy usa tablas dinámicas que todavía no están reflejadas
// completamente en el esquema generado del paquete compartido.
export const supabase: any = typedSupabase;
