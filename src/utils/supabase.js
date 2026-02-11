/**
 * Configuration Supabase - Étape 1
 * Connexion au projet sans modifier le reste de l'app.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uteqsqiqzcsuztnjmoto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZXFzcWlxemNzdXp0bmptb3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxOTQsImV4cCI6MjA4NjQyNDE5NH0.dqML-EV_7QziwUPHWUdJ_x-cEutB9mPvhKfgcbuz-5M';

let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[Supabase] Connexion OK — client créé', SUPABASE_URL);
} catch (e) {
  console.error('[Supabase] Erreur création client:', e?.message || e);
}

export { supabase };
