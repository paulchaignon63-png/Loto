/**
 * Gestion du localStorage pour les données de tirages
 */

const STORAGE_KEYS = {
  HISTORY: 'euromillions_history',
  PERSONAL_COMBOS: 'personal_combos'
};

export const storage = {
  /**
   * Sauvegarder l'historique des tirages
   */
  saveHistory(draws) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(draws));
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  },

  /**
   * Récupérer l'historique des tirages
   */
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  },

  /**
   * Ajouter une combo personnelle
   */
  addPersonalCombo(combo) {
    try {
      const combos = this.getPersonalCombos();
      const newCombo = {
        id: Date.now(),
        date: new Date().toISOString(),
        numbers: [...combo.numbers].sort((a, b) => a - b),
        stars: [...combo.stars].sort((a, b) => a - b),
        ...combo
      };
      combos.push(newCombo);
      localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(combos));
      return newCombo;
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      return null;
    }
  },

  /**
   * Récupérer toutes les combos personnelles
   */
  getPersonalCombos() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERSONAL_COMBOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  },

  /**
   * Supprimer une combo personnelle
   */
  deletePersonalCombo(id) {
    try {
      const combos = this.getPersonalCombos();
      const filtered = combos.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.PERSONAL_COMBOS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  },

  /**
   * Vider toutes les données
   */
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
