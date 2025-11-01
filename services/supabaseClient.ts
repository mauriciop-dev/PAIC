import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdqogvvuhcxciwoonomk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcW9ndnZ1aGN4Y2l3b29ub21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDUzMzEsImV4cCI6MjA3NzUyMTMzMX0.u3AO7YxEtysPmowjukvgGENL3hVgNDJ43ygoKPCP1Ys';

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);