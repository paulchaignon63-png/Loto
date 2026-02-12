/**
 * Générateur intelligent de combinaisons (5 numéros + 2 étoiles)
 * 3 modes : aléatoire pur, optimisé (recommandé), extrême
 */

import { detectPatterns, calculateBanalityScore, isComboInList } from './analyzer.js';

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
const MAX_ATTEMPTS_PURE_RANDOM = 500;

/**
 * Mode aléatoire pur : aucune optimisation, exclut les combos déjà tirées ou en historique.
 */
export function generatePureRandom(draws = [], excludedCombos = []) {
  const merged = excludedCombos.length > 0 ? excludedCombos : [...draws];
  for (let i = 0; i < MAX_ATTEMPTS_PURE_RANDOM; i++) {
    const combo = generateRandomCombo();
    if (!isComboInList(combo, merged)) {
      const banalityScore = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
      return { combo, banalityScore };
    }
  }
  const combo = generateRandomCombo();
  return { combo, banalityScore: draws.length > 0 ? calculateBanalityScore(combo, draws) : 50 };
}

/**
 * Mode optimisé : filtre les patterns communs, score ≤ 50, max 100 tentatives.
 * Exclut les combos déjà tirées ou en historique.
 */
export function generateOptimized(draws = [], excludedCombos = []) {
  const merged = excludedCombos.length > 0 ? excludedCombos : [...draws];
  let bestCombo = null;
  let bestScore = 100;

  for (let i = 0; i < MAX_ATTEMPTS_OPTIMIZED; i++) {
    const combo = generateRandomCombo();
    if (isComboInList(combo, merged)) continue;
    if (!passesOptimizedFilters(combo, draws)) continue;

    const score = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  }

  if (!bestCombo) bestCombo = generateRandomCombo();
  if (bestCombo && isComboInList(bestCombo, merged)) {
    bestCombo = null;
    for (let i = 0; i < MAX_ATTEMPTS_OPTIMIZED; i++) {
      const combo = generateRandomCombo();
      if (!isComboInList(combo, merged)) {
        bestCombo = combo;
        break;
      }
    }
    if (!bestCombo) bestCombo = generateRandomCombo();
  }
  if (bestCombo && draws.length === 0) bestScore = 50;
  if (bestCombo && draws.length > 0 && bestScore === 100) bestScore = calculateBanalityScore(bestCombo, draws);

  return {
    combo: bestCombo || generateRandomCombo(),
    banalityScore: bestScore
  };
}

/**
 * Mode extrême : contraintes renforcées, score < 20, max 200 tentatives.
 * Exclut les combos déjà tirées ou en historique.
 */
export function generateExtreme(draws = [], excludedCombos = []) {
  const merged = excludedCombos.length > 0 ? excludedCombos : [...draws];
  let bestCombo = null;
  let bestScore = 100;

  for (let i = 0; i < MAX_ATTEMPTS_EXTREME; i++) {
    const combo = generateRandomCombo();
    if (isComboInList(combo, merged)) continue;
    if (!passesExtremeFilters(combo, draws)) continue;

    const score = draws.length > 0 ? calculateBanalityScore(combo, draws) : 50;
    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  }

  if (!bestCombo) {
    bestCombo = generateRandomCombo();
    for (let i = 0; i < MAX_ATTEMPTS_EXTREME; i++) {
      const combo = generateRandomCombo();
      if (!isComboInList(combo, merged)) {
        bestCombo = combo;
        break;
      }
    }
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
 * @param {Array} draws - tirages historiques (CSV)
 * @param {Array} personalCombos - combos sauvegardées dans l'historique
 */
export function generateByMode(mode, draws = [], personalCombos = []) {
  const excludedCombos = [...draws, ...(personalCombos || [])];
  switch (mode) {
    case 'random':
      return generatePureRandom(draws, excludedCombos);
    case 'extreme':
      return generateExtreme(draws, excludedCombos);
    case 'optimized':
    default:
      return generateOptimized(draws, excludedCombos);
  }
}

// Rétrocompatibilité : ancienne API
export function generateOptimizedCombo(draws = [], personalCombos = []) {
  const excludedCombos = [...draws, ...(personalCombos || [])];
  const result = generateOptimized(draws, excludedCombos);
  return { combo: result.combo, attempts: 0, optimized: true };
}

export function generateBestCombo(draws = [], count = 10, personalCombos = []) {
  const excludedCombos = [...draws, ...(personalCombos || [])];
  let bestCombo = null;
  let bestScore = 100;
  for (let i = 0; i < count; i++) {
    const result = generateOptimized(draws, excludedCombos);
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
