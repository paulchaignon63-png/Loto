/**
 * Authentification Supabase (email / mot de passe)
 */
import { supabase, isSupabaseConfigured } from './supabase.js';

export const auth = {
  async getSession() {
    if (!supabase) return { data: { session: null } };
    return supabase.auth.getSession();
  },

  async signUp(email, password) {
    if (!supabase) return { data: { user: null }, error: new Error('Supabase non configuré') };
    return supabase.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    if (!supabase) return { data: { user: null }, error: new Error('Supabase non configuré') };
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    if (!supabase) return { error: new Error('Supabase non configuré') };
    return supabase.auth.signOut();
  },

  onAuthStateChange(callback) {
    if (!supabase) return () => {};
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  },

  isConfigured: isSupabaseConfigured,
};
