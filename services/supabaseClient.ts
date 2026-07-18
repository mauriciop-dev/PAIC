import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgmwlzhlpehuvfkgqzja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbXdsemhscGVodXZma2dxemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTA5MjQsImV4cCI6MjA3ODI2NjkyNH0.g1_wvl3tauVNdiEBOFD_yzXexXJu5ErEuCUJ3tnUKlE';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('URL_DE_TU_NUEVO')) {
    throw new Error("Por favor, actualiza las credenciales de Supabase en services/supabaseClient.ts con las de tu nuevo proyecto.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);