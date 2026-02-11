/**
 * Stockage : localStorage + sync Supabase quand l'utilisateur est connecté
 */
import { supabase } from './supabase.js';

const STORAGE_KEYS = {
  HISTORY: 'euromillions_history',
  PERSONAL_COMBOS: 'personal_combos'
};

const AUTH_USER_KEY = 'supabase_user_id';

function getUserId() {
  return localStorage.getItem(AUTH_USER_KEY) || null;
}

export const storage = {
  saveHistory(draws) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(draws));
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  },

  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  },

  setPersonalCombos(combos) {
    try {
      const list = Array.isArray(combos) ? combos : [];
      localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(list));
      return true;
    } catch (error) {
      console.error('Erreur setPersonalCombos:', error);
      return false;
    }
  },

  async addPersonalCombo(combo) {
    const sorted = {
      numbers: [...(combo.numbers || [])].sort((a, b) => a - b),
      stars: [...(combo.stars || [])].sort((a, b) => a - b)
    };
    const date = new Date().toISOString();
    const userId = getUserId();

    if (supabase && userId) {
      const { data: row, error } = await supabase
        .from('personal_combos')
        .insert({
          user_id: userId,
          numbers: sorted.numbers,
          stars: sorted.stars,
          date
        })
        .select('id, numbers, stars, date')
        .single();
      if (error) {
        console.error('Erreur Supabase addPersonalCombo:', error);
        return null;
      }
      const newCombo = { id: row.id, numbers: row.numbers, stars: row.stars, date: row.date };
      const combos = this.getPersonalCombos();
      combos.unshift(newCombo);
      localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(combos));
      return newCombo;
    }

    const newCombo = {
      id: Date.now(),
      date,
      numbers: sorted.numbers,
      stars: sorted.stars
    };
    const combos = this.getPersonalCombos();
    combos.push(newCombo);
    localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(combos));
    return newCombo;
  },

  getPersonalCombos() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERSONAL_COMBOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  },

  async deletePersonalCombo(id) {
    const userId = getUserId();
    const combos = this.getPersonalCombos();

    if (supabase && userId && (typeof id === 'string' && id.length > 10)) {
      await supabase.from('personal_combos').delete().eq('id', id).eq('user_id', userId);
    }
    const filtered = combos.filter(c => String(c.id) !== String(id));
    localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(filtered));
    return true;
  },

  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PERSONAL_COMBOS);
      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      return false;
    }
  }
};
