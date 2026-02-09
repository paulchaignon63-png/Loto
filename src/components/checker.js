/**
 * Composant de vérification de combinaison
 */

import { findSimilarCombos, detectPatterns, calculateBanalityScore } from '../utils/analyzer.js';
import { storage } from '../utils/storage.js';
import { renderComboAnalysis } from './analysisDisplay.js';

/**
 * Vérifie une combinaison et affiche les résultats
 */
export function checkCombo(combo) {
  const draws = storage.getHistory();
  
  if (draws.length === 0) {
    return {
      error: 'Aucune donnée historique chargée. Veuillez d\'abord importer des données.'
    };
  }

  // Vérifier la validité de la combo
  if (combo.numbers.length !== 5 || combo.stars.length !== 2) {
    return {
      error: 'Combinaison invalide. Veuillez entrer 5 numéros et 2 étoiles.'
    };
  }

  // Vérifier les doublons
  if (new Set(combo.numbers).size !== 5) {
    return {
      error: 'Les numéros doivent être différents.'
    };
  }
  if (new Set(combo.stars).size !== 2) {
    return {
      error: 'Les étoiles doivent être différentes.'
    };
  }

  // Trouver les combos similaires
  const similar = findSimilarCombos(combo, draws);
  
  // Détecter les patterns
  const patterns = detectPatterns(combo);
  
  // Calculer le score de banalité
  const banalityScore = calculateBanalityScore(combo, draws);

  return {
    exact: similar.exact,
    fourMatch: similar.fourMatch,
    threeMatch: similar.threeMatch,
    patterns,
    banalityScore
  };
}

/**
 * Formate les résultats pour l'affichage
 * @param {Object} results - Résultat de checkCombo()
 * @param {Object} combo - { numbers, stars } pour l'analyse détaillée
 */
export function formatCheckResults(results, combo) {
  if (results.error) {
    return `<div class="status-message error">${results.error}</div>`;
  }

  let html = '<div class="results">';

  // Combo exacte
  if (results.exact.length > 0) {
    html += '<div class="result-item">';
    html += `<h3>⚠️ Cette combinaison exacte est déjà sortie ${results.exact.length} fois !</h3>`;
    results.exact.forEach(draw => {
      html += `<p><strong>Date:</strong> ${draw.date}</p>`;
    });
    html += '</div>';
  } else {
    html += '<div class="result-item">';
    html += '<h3>✅ Cette combinaison exacte n\'est jamais sortie</h3>';
    html += '</div>';
  }

  // 4 numéros en commun
  if (results.fourMatch.length > 0) {
    html += '<div class="result-item">';
    html += `<h3>🎯 ${results.fourMatch.length} fois avec 4 numéros corrects</h3>`;
    const numFrequency = {};
    results.fourMatch.forEach(match => {
      match.matchingNumbers.forEach(num => {
        numFrequency[num] = (numFrequency[num] || 0) + 1;
      });
    });
    const mostCommon = Object.entries(numFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([num]) => num);
    html += `<p>Numéros en commun les plus fréquents : <strong>${mostCommon.join(', ')}</strong></p>`;
    if (results.fourMatch.length <= 5) {
      html += '<details style="margin-top: 10px;"><summary style="cursor: pointer; color: var(--accent-blue);">Voir les détails</summary>';
      results.fourMatch.forEach(match => {
        html += `<p style="margin: 5px 0;"><strong>${match.date}:</strong> ${match.matchingNumbers.join(', ')}`;
        if (match.matchingStars > 0) html += ` + ${match.matchingStars} étoile(s)`;
        html += `</p>`;
      });
      html += '</details>';
    }
    html += '</div>';
  }

  // 3 numéros en commun
  if (results.threeMatch.length > 0) {
    html += '<div class="result-item">';
    html += `<h3>📊 ${results.threeMatch.length} fois avec 3 numéros corrects</h3>`;
    const numFrequency = {};
    results.threeMatch.forEach(match => {
      match.matchingNumbers.forEach(num => {
        numFrequency[num] = (numFrequency[num] || 0) + 1;
      });
    });
    const mostCommon = Object.entries(numFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([num, count]) => `${num} (${count}x)`)
      .join(', ');
    html += `<p>Numéros en commun les plus fréquents : <strong>${mostCommon}</strong></p>`;
    html += '</div>';
  }

  // Bloc Analyse de combinaison (design refondu)
  html += renderComboAnalysis(combo, results.banalityScore);

  html += '</div>';
  return html;
}
