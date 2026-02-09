/**
 * Composant d'affichage des statistiques
 */

import { calculateFrequencies, calculateStarFrequencies, analyzeGridDistribution } from '../utils/analyzer.js';
import { storage } from '../utils/storage.js';

/**
 * Génère le HTML des statistiques
 */
export function renderStats() {
  const draws = storage.getHistory();
  
  if (draws.length === 0) {
    return '<p class="info-text">Importez d\'abord des données pour voir les statistiques.</p>';
  }

  const numFrequencies = calculateFrequencies(draws);
  const starFrequencies = calculateStarFrequencies(draws);

  // Trier par fréquence
  const sortedNums = Object.entries(numFrequencies)
    .map(([num, freq]) => ({ num: parseInt(num), freq }))
    .sort((a, b) => b.freq - a.freq);

  const sortedStars = Object.entries(starFrequencies)
    .map(([star, freq]) => ({ star: parseInt(star), freq }))
    .sort((a, b) => b.freq - a.freq);

  // Calculer les moyennes
  const maxFreq = Math.max(...sortedNums.map(n => n.freq));
  const minFreq = Math.min(...sortedNums.map(n => n.freq));
  const avgFreq = sortedNums.reduce((sum, n) => sum + n.freq, 0) / sortedNums.length;

  let html = '<div class="stats-content">';

  // Informations générales
  html += '<div class="stat-card">';
  html += '<div class="stat-title">📊 Informations générales</div>';
  html += `<p><strong>Nombre de tirages:</strong> ${draws.length}</p>`;
  html += `<p><strong>Fréquence moyenne:</strong> ${avgFreq.toFixed(2)}</p>`;
  html += `<p><strong>Fréquence max:</strong> ${maxFreq}</p>`;
  html += `<p><strong>Fréquence min:</strong> ${minFreq}</p>`;
  html += '</div>';

  // Numéros chauds
  html += '<div class="stat-card">';
  html += '<div class="stat-title">🔥 Numéros les plus fréquents (Top 10)</div>';
  html += '<div class="frequency-chart">';
  sortedNums.slice(0, 10).forEach(({ num, freq }) => {
    const intensity = (freq / maxFreq) * 100;
    html += `<div class="freq-item hot" style="opacity: ${0.5 + intensity / 200}">${num} (${freq})</div>`;
  });
  html += '</div>';
  html += '</div>';

  // Numéros froids
  html += '<div class="stat-card">';
  html += '<div class="stat-title">❄️ Numéros les moins fréquents (Bottom 10)</div>';
  html += '<div class="frequency-chart">';
  sortedNums.slice(-10).reverse().forEach(({ num, freq }) => {
    html += `<div class="freq-item cold">${num} (${freq})</div>`;
  });
  html += '</div>';
  html += '</div>';

  // Étoiles
  html += '<div class="stat-card">';
  html += '<div class="stat-title">⭐ Fréquences des étoiles</div>';
  html += '<div class="frequency-chart">';
  sortedStars.forEach(({ star, freq }) => {
    const maxStarFreq = Math.max(...sortedStars.map(s => s.freq));
    const intensity = (freq / maxStarFreq) * 100;
    html += `<div class="freq-item" style="opacity: ${0.5 + intensity / 200}">${star} (${freq})</div>`;
  });
  html += '</div>';
  html += '</div>';

  html += '</div>';

  return html;
}

/**
 * Génère la visualisation de grille pour une combinaison
 */
export function renderGridVisualization(combo) {
  if (!combo || !combo.numbers) {
    return '';
  }

  const grid = analyzeGridDistribution(combo);
  
  let html = '<div class="stat-card">';
  html += '<div class="stat-title">🎯 Visualisation sur la grille</div>';
  html += '<div class="grid-visualization">';
  
  grid.forEach(cell => {
    const classes = cell.selected ? 'grid-cell selected' : 'grid-cell';
    html += `<div class="${classes}">${cell.number}</div>`;
  });
  
  html += '</div>';
  html += '</div>';

  return html;
}
