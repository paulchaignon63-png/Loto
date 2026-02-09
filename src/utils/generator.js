/**
 * Générateur intelligent de combinaisons EuroMillions
 */

import { detectPatterns, calculateBanalityScore, calculateFrequencies } from './analyzer.js';

/**
 * Génère un nombre aléatoire entre min et max (inclus)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère une combinaison aléatoire simple
 */
function generateRandomCombo() {
  const numbers = [];
  const stars = [];

  // Générer 5 numéros uniques entre 1 et 50
  while (numbers.length < 5) {
    const num = randomInt(1, 50);
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }

  // Générer 2 étoiles uniques entre 1 et 12
  while (stars.length < 2) {
    const star = randomInt(1, 12);
    if (!stars.includes(star)) {
      stars.push(star);
    }
  }

  return {
    numbers: numbers.sort((a, b) => a - b),
    stars: stars.sort((a, b) => a - b)
  };
}

/**
 * Vérifie si une combinaison respecte les critères d'optimisation
 */
function isOptimized(combo, draws) {
  const patterns = detectPatterns(combo);
  
  // Rejeter les patterns trop évidents
  const highSeverityPatterns = patterns.filter(p => p.severity === 'high');
  if (highSeverityPatterns.length > 0) {
    return false;
  }

  // Vérifier la somme (idéalement entre 100 et 200)
  const sum = combo.numbers.reduce((a, b) => a + b, 0);
  if (sum < 80 || sum > 220) {
    return false;
  }

  // Vérifier l'écart (idéalement entre 20 et 45)
  const sorted = [...combo.numbers].sort((a, b) => a - b);
  const spread = sorted[4] - sorted[0];
  if (spread < 15 || spread > 48) {
    return false;
  }

  // Vérifier qu'on n'a pas tous pairs ou tous impairs
  const allEven = combo.numbers.every(n => n % 2 === 0);
  const allOdd = combo.numbers.every(n => n % 2 === 1);
  if (allEven || allOdd) {
    return false;
  }

  return true;
}

/**
 * Génère une combinaison optimisée qui évite les patterns populaires
 */
export function generateOptimizedCombo(draws = []) {
  const maxAttempts = 1000;
  let attempts = 0;
  let bestCombo = null;
  let bestScore = 100; // On cherche le score le plus bas

  while (attempts < maxAttempts) {
    const combo = generateRandomCombo();
    
    // Si on a des données historiques, utiliser l'analyse
    if (draws.length > 0) {
      const score = calculateBanalityScore(combo, draws);
      
      // Si le score est acceptable et la combo est optimisée
      if (score < bestScore && isOptimized(combo, draws)) {
        bestCombo = combo;
        bestScore = score;
        
        // Si on trouve une très bonne combo (score < 20), on s'arrête
        if (score < 20) {
          break;
        }
      }
    } else {
      // Sans données, juste vérifier l'optimisation basique
      if (isOptimized(combo, draws)) {
        bestCombo = combo;
        break;
      }
    }

    attempts++;
  }

  // Si on n'a rien trouvé d'optimal, retourner une combo aléatoire quand même
  if (!bestCombo) {
    bestCombo = generateRandomCombo();
  }

  return {
    combo: bestCombo,
    attempts,
    optimized: attempts < maxAttempts
  };
}

/**
 * Génère plusieurs combinaisons et retourne la meilleure
 */
export function generateBestCombo(draws = [], count = 10) {
  let bestCombo = null;
  let bestScore = 100;

  for (let i = 0; i < count; i++) {
    const result = generateOptimizedCombo(draws);
    const score = draws.length > 0 
      ? calculateBanalityScore(result.combo, draws)
      : 50; // Score neutre si pas de données

    if (score < bestScore) {
      bestScore = score;
      bestCombo = result.combo;
    }
  }

  return {
    combo: bestCombo || generateRandomCombo(),
    banalityScore: bestScore
  };
}
