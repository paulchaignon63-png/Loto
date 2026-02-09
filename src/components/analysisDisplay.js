/**
 * Affichage de l'analyse de combinaison (design refondu)
 * Utilisé par l'onglet Vérifier et par le Générateur
 */

import { detectPatterns } from '../utils/analyzer.js';

/** Couleurs sémantiques pour les statuts */
const STATUS = {
  ok: { emoji: '✓', class: 'status-ok' },
  warn: { emoji: '⚠️', class: 'status-warn' },
  bad: { emoji: '✗', class: 'status-bad' }
};

/**
 * Détecte si la combo a des numéros tous multiples d'un même nombre (ex: 5, 10, 15, 20, 25)
 */
function hasMultipleOfSame(numbers) {
  for (const base of [2, 5, 10]) {
    if (numbers.every(n => n % base === 0)) return true;
  }
  return false;
}

/**
 * Génère le HTML du bloc "Analyse de votre combinaison"
 * @param {Object} combo - { numbers: number[], stars: number[] }
 * @param {number} banalityScore - score 0-100
 * @returns {string} HTML
 */
export function renderComboAnalysis(combo, banalityScore) {
  const numbers = [...combo.numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const spread = numbers[4] - numbers[0];
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const oddCount = 5 - evenCount;
  const tens = numbers.map(n => Math.floor((n - 1) / 10));
  const uniqueTens = new Set(tens).size;

  const patterns = detectPatterns(combo);
  const hasConsecutive = patterns.some(p => p.type === 'consecutive');
  const hasSameDecade = patterns.some(p => p.type === 'same_decade');
  const hasDates = patterns.some(p => p.type === 'dates');
  const hasMultiples = hasMultipleOfSame(numbers);

  // Distribution spatiale : équilibrée si spread entre 15 et 48
  const spreadOk = spread >= 15 && spread <= 48;
  // Somme : zone optimale 80-220
  const sumOk = sum >= 80 && sum <= 220;
  // Pairs/impairs : mix (pas tous pairs ni tous impairs)
  const parityOk = evenCount >= 1 && oddCount >= 1;
  // Patterns à risque : aucun si pas de suite, pas dizaine unique, pas dates, pas multiples
  const noRiskyPatterns = !hasConsecutive && !(uniqueTens <= 2) && !hasDates && !hasMultiples;

  let html = '<div class="combo-analysis-card">';
  html += '<h2 class="combo-analysis-title">✨ Analyse de votre combinaison</h2>';

  // ----- Section métriques -----
  html += '<div class="combo-analysis-metrics">';

  // 1. Distribution spatiale
  html += '<div class="analysis-metric">';
  html += `<div class="metric-header">`;
  html += `<span class="metric-icon">📊</span>`;
  html += `<span class="metric-label">Distribution spatiale :</span>`;
  html += spreadOk
    ? `<span class="${STATUS.ok.class}">Équilibrée ${STATUS.ok.emoji}</span>`
    : `<span class="${STATUS.warn.class}">À améliorer ${STATUS.warn.emoji}</span>`;
  html += `</div>`;
  html += '<p class="metric-detail">→ Les numéros sont ' + (spreadOk ? 'bien répartis' : 'soit trop groupés, soit trop espacés') + ' sur la grille</p>';
  if (spreadOk) html += '<p class="metric-detail">→ Pas tous groupés, pas trop espacés</p>';
  html += '</div>';

  // 2. Somme totale
  html += '<div class="analysis-metric">';
  html += '<div class="metric-header">';
  html += '<span class="metric-icon">📈</span>';
  html += '<span class="metric-label">Somme totale :</span>';
  html += `<span class="metric-value">${sum}</span>`;
  html += '</div>';
  html += `<p class="metric-detail">→ Zone optimale : 80-220 ${sumOk ? STATUS.ok.emoji : STATUS.warn.emoji}</p>`;
  html += '<p class="metric-detail">→ Évite les extrêmes statistiques</p>';
  html += '</div>';

  // 3. Répartition pairs/impairs
  html += '<div class="analysis-metric">';
  html += '<div class="metric-header">';
  html += '<span class="metric-icon">⚖️</span>';
  html += '<span class="metric-label">Répartition pairs/impairs :</span>';
  html += parityOk
    ? `<span class="${STATUS.ok.class}">${evenCount} pairs, ${oddCount} impairs ${STATUS.ok.emoji}</span>`
    : `<span class="${STATUS.warn.class}">${evenCount} pairs, ${oddCount} impairs ${STATUS.warn.emoji}</span>`;
  html += '</div>';
  html += '<p class="metric-detail">→ ' + (parityOk ? 'Mix équilibré' : 'Mélanger pairs et impairs est préférable') + '</p>';
  if (parityOk) html += '<p class="metric-detail">→ Mieux que 100% pairs ou 100% impairs</p>';
  html += '</div>';

  // 4. Patterns à risque
  html += '<div class="analysis-metric">';
  html += '<div class="metric-header">';
  html += '<span class="metric-icon">🎯</span>';
  html += '<span class="metric-label">Patterns à risque :</span>';
  html += noRiskyPatterns
    ? `<span class="${STATUS.ok.class}">Aucun détecté ${STATUS.ok.emoji}</span>`
    : `<span class="${STATUS.warn.class}">${patterns.length} détecté(s) ${STATUS.warn.emoji}</span>`;
  html += '</div>';
  html += '<ul class="metric-checklist">';
  html += `<li class="${hasConsecutive ? STATUS.bad.class : STATUS.ok.class}">${hasConsecutive ? STATUS.bad.emoji : STATUS.ok.emoji} Suite consécutive (ex: 1,2,3,4,5)</li>`;
  html += `<li class="${uniqueTens <= 2 ? STATUS.bad.class : STATUS.ok.class}">${uniqueTens <= 2 ? STATUS.bad.emoji : STATUS.ok.emoji} Dizaine unique (ex: tous entre 10-19)</li>`;
  html += `<li class="${hasDates ? STATUS.bad.class : STATUS.ok.class}">${hasDates ? STATUS.bad.emoji : STATUS.ok.emoji} Date évidente (ex: tous ≤31)</li>`;
  html += `<li class="${hasMultiples ? STATUS.bad.class : STATUS.ok.class}">${hasMultiples ? STATUS.bad.emoji : STATUS.ok.emoji} Multiples d'un même nombre</li>`;
  html += '</ul>';
  html += '</div>';

  html += '</div>'; // .combo-analysis-metrics

  // ----- Séparateur -----
  html += '<div class="combo-analysis-divider"></div>';

  // ----- Score de banalité -----
  const scorePercent = Math.round(banalityScore);
  let scoreLabel = '';
  let scoreEmoji = '🟡';
  if (banalityScore <= 30) {
    scoreLabel = 'Combo originale (partage minimal)';
    scoreEmoji = '🟢';
  } else if (banalityScore <= 70) {
    scoreLabel = 'Combo moyennement commune';
    scoreEmoji = '🟡';
  } else {
    scoreLabel = 'Combo très commune (partage élevé)';
    scoreEmoji = '🔴';
  }

  let impactText = '';
  if (banalityScore <= 30) {
    impactText = 'En cas de jackpot, risque FAIBLE de devoir partager avec d\'autres gagnants.';
  } else if (banalityScore <= 70) {
    impactText = 'En cas de jackpot, risque MOYEN de devoir partager avec d\'autres gagnants utilisant des patterns similaires.';
  } else {
    impactText = 'En cas de jackpot, risque ÉLEVÉ de devoir partager avec de nombreux autres gagnants.';
  }

  html += '<div class="combo-analysis-banality">';
  html += '<h3 class="banality-title">🎭 Score de banalité : ' + banalityScore + '/100</h3>';
  const barClass = banalityScore <= 30 ? 'banality-bar-fill--low' : banalityScore <= 70 ? 'banality-bar-fill--mid' : 'banality-bar-fill--high';
  html += '<div class="banality-bar-wrap">';
  html += '<div class="banality-bar" role="progressbar" aria-valuenow="' + scorePercent + '" aria-valuemin="0" aria-valuemax="100">';
  html += '<div class="banality-bar-fill ' + barClass + '" style="width: ' + scorePercent + '%"></div>';
  html += '</div>';
  html += '<span class="banality-bar-label">' + scorePercent + '/100</span>';
  html += '</div>';
  html += '<p class="banality-label">' + scoreEmoji + ' ' + scoreLabel + '</p>';
  html += '<p class="banality-impact"><strong>💰 Impact sur vos gains potentiels :</strong><br>' + impactText + '</p>';
  html += '<div class="banality-scale">';
  html += '<p class="banality-scale-title">📊 Échelle de banalité :</p>';
  html += '<ul class="banality-scale-list">';
  html += '<li><span class="scale-dot scale-green">🟢</span> 0-30 : Combo originale (partage minimal)</li>';
  html += '<li><span class="scale-dot scale-yellow">🟡</span> 31-70 : Combo moyenne (partage modéré)</li>';
  html += '<li><span class="scale-dot scale-red">🔴</span> 71-100 : Combo très commune (partage élevé)</li>';
  html += '</ul>';
  html += '</div>';
  html += '</div>'; // .combo-analysis-banality

  html += '</div>'; // .combo-analysis-card
  return html;
}
