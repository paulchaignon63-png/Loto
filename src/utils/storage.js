/**
 * Stockage : base centrale Supabase (tirages) + localStorage/Supabase (combos perso)
 */
import { supabase } from './supabase.js';

const STORAGE_KEYS = {
  PERSONAL_COMBOS: 'personal_combos'
};

const AUTH_USER_KEY = 'supabase_user_id';

let drawsCache = [];
let drawsCachePromise = null;

function getUserId() {
  return localStorage.getItem(AUTH_USER_KEY) || null;
}

export const storage = {
  async ensureDrawsLoaded() {
    if (drawsCachePromise) return drawsCachePromise;
    drawsCachePromise = (async () => {
      if (!supabase) {
        console.warn('[Storage] Supabase non configuré, tirages vides');
        return [];
      }
      try {
        const BATCH = 1000;
        let all = [];
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('euromillions_draws')
            .select('date, numbers, stars')
            .order('date', { ascending: true })
            .range(offset, offset + BATCH - 1);
          if (error) throw error;
          const batch = data || [];
          all = all.concat(batch.map(r => ({ date: r.date, numbers: r.numbers, stars: r.stars })));
          hasMore = batch.length === BATCH;
          offset += BATCH;
        }
        drawsCache = all;
        // #region agent log
        const sorted = all.slice().sort((a, b) => {
          const parse = (d) => new Date(d.split('/').reverse().join('-'));
          return parse(a.date) - parse(b.date);
        });
        const firstDate = sorted[0]?.date ?? null;
        const lastDate = sorted[sorted.length - 1]?.date ?? null;
        fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storage.js:ensureDrawsLoaded',message:'Tirages chargés depuis Supabase',data:{drawsCount:drawsCache.length,firstDate,lastDate},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return drawsCache;
      } catch (e) {
        console.error('[Storage] Erreur chargement tirages:', e?.message || e);
        return [];
      }
    })();
    return drawsCachePromise;
  },

  saveHistory() {
    // Lecture seule côté client : la base centrale est alimentée par le script d'import et l'Edge Function
    return true;
  },

  invalidateDrawsCache() {
    drawsCache = [];
    drawsCachePromise = null;
  },

  getHistory() {
    return drawsCache;
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
    const userId = getUserId();
    if (!userId) return null;

    const sorted = {
      numbers: [...(combo.numbers || [])].sort((a, b) => a - b),
      stars: [...(combo.stars || [])].sort((a, b) => a - b)
    };
    const date = new Date().toISOString();

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
      localStorage.removeItem(STORAGE_KEYS.PERSONAL_COMBOS);
      drawsCache = [];
      drawsCachePromise = null;
      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      return false;
    }
  }
};
