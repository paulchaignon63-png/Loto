/**
 * Composant de gestion de l'historique personnel
 */

import { storage } from '../utils/storage.js';
import { findSimilarCombos } from '../utils/analyzer.js';

/**
 * Affiche toutes les combos sauvegardées
 */
export function renderPersonalHistory() {
  const combos = storage.getPersonalCombos();
  
  if (combos.length === 0) {
    return '<p class="info-text">Aucune combinaison sauvegardée pour le moment.</p>';
  }

  const draws = storage.getHistory();
  let html = '<div class="saved-combos">';

  // Trier par date (plus récent en premier)
  combos.sort((a, b) => new Date(b.date) - new Date(a.date));

  combos.forEach(combo => {
    const similar = draws.length > 0 ? findSimilarCombos(combo, draws) : { exact: [], fourMatch: [], threeMatch: [] };
    
    html += '<div class="saved-combo-item">';
    html += '<div>';
    html += `<div class="combo-date">${new Date(combo.date).toLocaleDateString('fr-FR')}</div>`;
    html += '<div class="combo-display">';
    
    combo.numbers.forEach(num => {
      html += `<span class="combo-number">${num}</span>`;
    });
    
    combo.stars.forEach(star => {
      html += `<span class="combo-star">${star}</span>`;
    });
    
    html += '</div>';
    
    // Afficher les résultats si disponibles
    if (draws.length > 0) {
      html += '<div style="margin-top: 10px; font-size: 0.9rem; color: var(--text-secondary);">';
      if (similar.exact.length > 0) {
        html += `⚠️ Sortie ${similar.exact.length}x`;
      } else if (similar.fourMatch.length > 0) {
        html += `🎯 ${similar.fourMatch.length} fois avec 4/5`;
      } else if (similar.threeMatch.length > 0) {
        html += `📊 ${similar.threeMatch.length} fois avec 3/5`;
      } else {
        html += '✅ Jamais sortie';
      }
      html += '</div>';
    }
    
    html += '</div>';
    html += `<button class="delete-btn" data-id="${combo.id}">Supprimer</button>`;
    html += '</div>';
  });

  html += '</div>';
  return html;
}

/**
 * Exporte les combos en CSV
 */
export function exportToCSV() {
  const combos = storage.getPersonalCombos();
  
  if (combos.length === 0) {
    return null;
  }

  // En-tête CSV
  let csv = 'Date,Num1,Num2,Num3,Num4,Num5,Star1,Star2\n';
  
  combos.forEach(combo => {
    const date = new Date(combo.date).toLocaleDateString('fr-FR');
    const nums = combo.numbers.join(',');
    const stars = combo.stars.join(',');
    csv += `${date},${nums},${stars}\n`;
  });

  return csv;
}
