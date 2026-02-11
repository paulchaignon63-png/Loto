/**
 * Client Supabase (Auth + Data API)
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// #region agent log
fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:init',message:'supabase env',data:{hasUrl:!!url,hasKey:!!anonKey,urlLen:url?.length||0},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
// #endregion

if (!url || !anonKey) {
  console.warn('Combo Check: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. Sync désactivée.');
}

let supabase = null;
if (url && anonKey) {
  try {
    supabase = createClient(url, anonKey);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:createClient',message:'client created',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:createClient',message:'createClient throw',data:{msg:String(e?.message||e)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.warn('Combo Check: Supabase client indisponible, mode local uniquement.', e?.message || e);
    supabase = null;
  }
}

export { supabase };
export const isSupabaseConfigured = () => !!supabase;
