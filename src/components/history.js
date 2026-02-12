/**
 * Composant de gestion de l'historique personnel
 */

import { storage } from '../utils/storage.js';
import { findSimilarCombos } from '../utils/analyzer.js';

/**
 * Affiche toutes les combos sauvegardées avec leur date
 */
export function renderPersonalHistory() {
  const combos = storage.getPersonalCombos();
  const draws = storage.getHistory();

  if (combos.length === 0) {
    return '<p class="info-text">Aucune combinaison sauvegardée pour le moment.<br>Sauvegardez des combos depuis les pages Générer ou Vérifier.</p>';
  }

  let html = '<div class="saved-combos">';

  // Trier par date (plus récent en premier)
  combos.sort((a, b) => new Date(b.date) - new Date(a.date));

  combos.forEach(combo => {
    const similar = findSimilarCombos(combo, draws);
    const winningDates = similar.exact.map((d) => d.date).filter(Boolean);

    html += '<div class="saved-combo-item">';
    html += '<div>';
    html += '<div class="combo-date-row">';
    html += `<span class="combo-date">${new Date(combo.date).toLocaleDateString('fr-FR')}</span>`;
    if (winningDates.length > 0) {
      const tooltip = winningDates.length === 1
        ? `Gagnante le ${winningDates[0]}`
        : `Gagnante : ${winningDates.join(', ')}`;
      html += `<span class="combo-winning-badge" title="${tooltip}" aria-label="${tooltip}">★</span>`;
    }
    html += '</div>';
    html += '<div class="combo-display">';

    combo.numbers.forEach((num) => {
      html += `<span class="combo-number">${num}</span>`;
    });

    combo.stars.forEach((star) => {
      html += `<span class="combo-star">${star}</span>`;
    });

    html += '</div></div>';
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
