/**
 * Analyses statistiques des tirages (5 numéros + 2 étoiles)
 */

/**
 * Calcule les fréquences de chaque numéro
 */
export function calculateFrequencies(draws) {
  const frequencies = {};
  
  // Initialiser tous les numéros de 1 à 50
  for (let i = 1; i <= 50; i++) {
    frequencies[i] = 0;
  }

  // Compter les occurrences
  draws.forEach(draw => {
    draw.numbers.forEach(num => {
      frequencies[num]++;
    });
  });

  return frequencies;
}

/**
 * Calcule les fréquences des étoiles
 */
export function calculateStarFrequencies(draws) {
  const frequencies = {};
  
  // Initialiser toutes les étoiles de 1 à 12
  for (let i = 1; i <= 12; i++) {
    frequencies[i] = 0;
  }

  // Compter les occurrences
  draws.forEach(draw => {
    draw.stars.forEach(star => {
      frequencies[star]++;
    });
  });

  return frequencies;
}

/**
 * Détecte les patterns dans une combinaison
 */
export function detectPatterns(combo) {
  const patterns = [];
  const numbers = [...combo.numbers].sort((a, b) => a - b);
  const stars = [...combo.stars].sort((a, b) => a - b);

  // Suite consécutive
  let consecutive = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i + 1] === numbers[i] + 1) {
      consecutive++;
    }
  }
  if (consecutive >= 3) {
    patterns.push({
      type: 'consecutive',
      severity: consecutive >= 4 ? 'high' : 'medium',
      message: `${consecutive + 1} numéros consécutifs détectés`,
      advice: consecutive >= 4 
        ? '⚠️ Très commun : beaucoup de joueurs choisissent des suites (ex: 1-2-3-4-5)'
        : '💡 Pattern assez fréquent, souvent choisi par les joueurs'
    });
  }

  // Tous pairs ou tous impairs
  const allEven = numbers.every(n => n % 2 === 0);
  const allOdd = numbers.every(n => n % 2 === 1);
  if (allEven) {
    patterns.push({
      type: 'all_even',
      severity: 'medium',
      message: 'Tous les numéros sont pairs',
      advice: '💡 Pattern fréquent : mélanger pairs et impairs est plus équilibré'
    });
  }
  if (allOdd) {
    patterns.push({
      type: 'all_odd',
      severity: 'medium',
      message: 'Tous les numéros sont impairs',
      advice: '💡 Pattern fréquent : mélanger pairs et impairs est plus équilibré'
    });
  }

  // Même dizaine
  const tens = numbers.map(n => Math.floor((n - 1) / 10));
  const uniqueTens = new Set(tens);
  if (uniqueTens.size <= 2) {
    patterns.push({
      type: 'same_decade',
      severity: 'medium',
      message: `${5 - uniqueTens.size + 1} numéros dans la même dizaine`,
      advice: '💡 Répartir les numéros sur toute la grille (1-50) est plus équilibré'
    });
  }

  // Dates évidentes (tous ≤ 31)
  if (numbers.every(n => n <= 31)) {
    patterns.push({
      type: 'dates',
      severity: 'low',
      message: 'Tous les numéros sont ≤ 31 (dates)',
      advice: '💡 Beaucoup de joueurs choisissent des dates (anniversaires, etc.)'
    });
  }

  // Somme extrême
  const sum = numbers.reduce((a, b) => a + b, 0);
  if (sum < 100) {
    patterns.push({
      type: 'low_sum',
      severity: 'medium',
      message: `Somme très faible (${sum})`,
      advice: '💡 Les combos avec des petits numéros sont souvent choisies'
    });
  }
  if (sum > 200) {
    patterns.push({
      type: 'high_sum',
      severity: 'medium',
      message: `Somme très élevée (${sum})`,
      advice: '💡 Les combos avec des grands numéros sont moins fréquentes'
    });
  }

  // Distribution groupée
  const spread = numbers[4] - numbers[0];
  if (spread < 20) {
    patterns.push({
      type: 'grouped',
      severity: 'medium',
      message: `Numéros très groupés (écart: ${spread})`,
      advice: '💡 Répartir les numéros sur toute la grille évite ce pattern commun'
    });
  }

  return patterns;
}

/**
 * Calcule le score de banalité (0-100)
 * Plus le score est élevé, plus la combo ressemble aux patterns populaires
 */
export function calculateBanalityScore(combo, draws) {
  if (draws.length === 0) return 0;

  let score = 0;
  const patterns = detectPatterns(combo);
  const frequencies = calculateFrequencies(draws);

  // Patterns détectés
  patterns.forEach(pattern => {
    switch (pattern.severity) {
      case 'high':
        score += 20;
        break;
      case 'medium':
        score += 10;
        break;
      case 'low':
        score += 5;
        break;
    }
  });

  // Fréquences des numéros
  const comboFreq = combo.numbers.map(n => frequencies[n] || 0);
  const avgFreq = comboFreq.reduce((a, b) => a + b, 0) / 5;
  const maxFreq = Math.max(...Object.values(frequencies));
  const minFreq = Math.min(...Object.values(frequencies));
  
  // Si tous les numéros sont très fréquents
  if (avgFreq > maxFreq * 0.8) {
    score += 15;
  }
  // Si tous les numéros sont très peu fréquents
  if (avgFreq < minFreq * 1.2) {
    score += 10;
  }

  // Normaliser entre 0 et 100
  return Math.min(100, Math.max(0, score));
}

/**
 * Trouve les combinaisons similaires (4/5 ou 3/5 numéros en commun)
 */
export function findSimilarCombos(combo, draws) {
  const results = {
    exact: [],
    fourMatch: [],
    threeMatch: []
  };

  const comboNums = new Set(combo.numbers);
  const comboStars = new Set(combo.stars);

  draws.forEach(draw => {
    const drawNums = new Set(draw.numbers);
    const drawStars = new Set(draw.stars);

    // Intersection des numéros
    const numIntersection = [...comboNums].filter(n => drawNums.has(n));
    const starIntersection = [...comboStars].filter(s => drawStars.has(s));

    // Combo exacte
    if (numIntersection.length === 5 && starIntersection.length === 2) {
      results.exact.push(draw);
    }
    // 4 numéros en commun
    else if (numIntersection.length === 4) {
      results.fourMatch.push({
        ...draw,
        matchingNumbers: numIntersection,
        matchingStars: starIntersection.length
      });
    }
    // 3 numéros en commun
    else if (numIntersection.length === 3) {
      results.threeMatch.push({
        ...draw,
        matchingNumbers: numIntersection,
        matchingStars: starIntersection.length
      });
    }
  });

  return results;
}

/**
 * Analyse la distribution sur la grille
 */
export function analyzeGridDistribution(combo) {
  const grid = Array(50).fill(0).map((_, i) => i + 1);
  const selected = new Set(combo.numbers);
  
  return grid.map(num => ({
    number: num,
    selected: selected.has(num),
    row: Math.floor((num - 1) / 10),
    col: (num - 1) % 10
  }));
}
