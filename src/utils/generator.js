/**
 * Générateur intelligent de combinaisons EuroMillions
 * 3 modes : aléatoire pur, optimisé (recommandé), extrême
 */

import { detectPatterns, calculateBanalityScore } from './analyzer.js';

/**
 * Génère un nombre aléatoire entre min et max (inclus)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère une combinaison aléatoire simple (mode aléatoire pur)
 * Aucun filtre, Math.random() uniquement.
 */
export function generateRandomCombo() {
  const numbers = [];
  const stars = [];

  while (numbers.length < 5) {
    const num = randomInt(1, 50);
    if (!numbers.includes(num)) numbers.push(num);
  }
  while (stars.length < 2) {
    const star = randomInt(1, 12);
    if (!stars.includes(star)) stars.push(star);
  }

  return {
    numbers: numbers.sort((a, b) => a - b),
    stars: stars.sort((a, b) => a - b)
  };
}

/** Retourne true si la combo a une suite consécutive (3+ numéros) */
function hasConsecutive(combo) {
  const numbers = [...combo.numbers].sort((a, b) => a - b);
  let consecutive = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i + 1] === numbers[i] + 1) consecutive++;
    else consecutive = 0;
    if (consecutive >= 2) return true; // 3 numéros consécutifs
  }
  return false;
}

/** Retourne true si tous les numéros sont dans une seule dizaine (ex: tous 10-19) */
function isSameDecade(combo) {
  const tens = combo.numbers.map(n => Math.floor((n - 1) / 10));
  return new Set(tens).size <= 1;
}

/** Critères pour le mode optimisé : rejette les patterns communs + somme + score */
function passesOptimizedFilters(combo, draws) {
  const patterns = detectPatterns(combo);
  const highSeverity = patterns.some(p => p.severity === 'high');
  if (highSeverity) return false;

  const sum = combo.numbers.reduce((a, b) => a + b, 0);
  if (sum < 80 || sum > 220) return false;

  const sorted = [...combo.numbers].sort((a, b) => a - b);
  const spread = sorted[4] - sorted[0];
  if (spread < 15 || spread > 48) return false;

  const allEven = combo.numbers.every(n => n % 2 === 0);
  const allOdd = combo.numbers.every(n => n % 2 === 1);
  if (allEven || allOdd) return false;

  if (hasConsecutive(combo)) return false;
  if (isSameDecade(combo)) return false;
  if (combo.numbers.every(n => n <= 31)) return false;

  if (draws.length > 0) {
    const score = calculateBanalityScore(combo, draws);
    if (score > 50) return false;
  }

  return true;
}

/** Critères pour le mode extrême : tout du mode optimisé + contraintes supplémentaires */
function passesExtremeFilters(combo, draws) {
  if (!passesOptimizedFilters(combo, draws)) return false;

  const evenCount = combo.numbers.filter(n => n % 2 === 0).length;
  const oddCount = 5 - evenCount;
  if (evenCount < 2 || oddCount < 2) return false; // force 2-3 ou 3-2

  const tens = combo.numbers.map(n => Math.floor((n - 1) / 10));
  if (new Set(tens).size < 3) return false; // au moins 3 dizaines

  const multi5 = combo.numbers.filter(n => n % 5 === 0).length;
  if (multi5 > 2) return false; // évite trop de multiples de 5

  if (combo.numbers.includes(7) || combo.numbers.includes(13)) return false; // évite 7 et 13

  if (draws.length > 0) {
    const score = calculateBanalityScore(combo, draws);
    if (score >= 20) return false; // vise score < 20
  }

  return true;
}

const MAX_ATTEMPTS_OPTIMIZED = 100;
const MAX_ATTEMPTS_EXTREME = 200;

/**
 * Mode aléatoire pur : aucune optimisation, retour immédiat.
 */
export function generatePureRandom(draws = []) {
  const combo = generateRandomCombo();
  const banalityScore = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
  return { combo, banalityScore };
}

/**
 * Mode optimisé : filtre les patterns communs, score ≤ 50, max 100 tentatives.
 */
export function generateOptimized(draws = []) {
  let bestCombo = null;
  let bestScore = 100;

  for (let i = 0; i < MAX_ATTEMPTS_OPTIMIZED; i++) {
    const combo = generateRandomCombo();
    if (!passesOptimizedFilters(combo, draws)) continue;

    const score = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  }

  if (!bestCombo) bestCombo = generateRandomCombo();
  if (bestCombo && draws.length === 0) bestScore = 50;
  if (bestCombo && draws.length > 0 && bestScore === 100) bestScore = calculateBanalityScore(bestCombo, draws);

  return {
    combo: bestCombo || generateRandomCombo(),
    banalityScore: bestScore
  };
}

/**
 * Mode extrême : contraintes renforcées, score < 20, max 200 tentatives.
 */
export function generateExtreme(draws = []) {
  let bestCombo = null;
  let bestScore = 100;

  for (let i = 0; i < MAX_ATTEMPTS_EXTREME; i++) {
    const combo = generateRandomCombo();
    if (!passesExtremeFilters(combo, draws)) continue;

    const score = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  }

  if (!bestCombo) {
    bestCombo = generateRandomCombo();
    bestScore = draws.length > 0 ? calculateBanalityScore(bestCombo, draws) : 50;
  }

  return {
    combo: bestCombo,
    banalityScore: bestScore
  };
}

/**
 * Génère une combo selon le mode choisi.
 * @param {string} mode - 'random' | 'optimized' | 'extreme'
 * @param {Array} draws - tirages historiques
 */
export function generateByMode(mode, draws = []) {
  switch (mode) {
    case 'random':
      return generatePureRandom(draws);
    case 'extreme':
      return generateExtreme(draws);
    case 'optimized':
    default:
      return generateOptimized(draws);
  }
}

// Rétrocompatibilité : ancienne API
export function generateOptimizedCombo(draws = []) {
  const result = generateOptimized(draws);
  return { combo: result.combo, attempts: 0, optimized: true };
}

export function generateBestCombo(draws = [], count = 10) {
  let bestCombo = null;
  let bestScore = 100;
  for (let i = 0; i < count; i++) {
    const result = generateOptimized(draws);
    if (result.banalityScore < bestScore) {
      bestScore = result.banalityScore;
      bestCombo = result.combo;
    }
  }
  return {
    combo: bestCombo || generateRandomCombo(),
    banalityScore: bestScore
  };
}
