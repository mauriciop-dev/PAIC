import { createClient } from '@supabase/supabase-js';

// TODO: Reemplaza estas credenciales con las de tu NUEVO proyecto de Supabase.
const supabaseUrl = 'URL_DE_TU_NUEVO_PROYECTO_SUPABASE';
const supabaseKey = 'CLAVE_ANON_DE_TU_NUEVO_PROYECTO_SUPABASE';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('URL_DE_TU_NUEVO')) {
    throw new Error("Por favor, actualiza las credenciales de Supabase en services/supabaseClient.ts con las de tu nuevo proyecto.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);