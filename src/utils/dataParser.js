/**
 * Parser pour les fichiers CSV d'historique EuroMillions
 */

/**
 * Parse une ligne CSV et retourne un objet tirage
 * Formats acceptés :
 * - date, num1, num2, num3, num4, num5, star1, star2
 * - date; num1; num2; num3; num4; num5; star1; star2
 */
function parseCSVLine(line) {
  // Gérer les séparateurs virgule ou point-virgule
  const separator = line.includes(';') ? ';' : ',';
  const parts = line.split(separator).map(p => p.trim());

  if (parts.length < 8) {
    return null;
  }

  const date = parts[0];
  const numbers = [
    parseInt(parts[1]),
    parseInt(parts[2]),
    parseInt(parts[3]),
    parseInt(parts[4]),
    parseInt(parts[5])
  ];
  const stars = [
    parseInt(parts[6]),
    parseInt(parts[7])
  ];

  // Validation
  if (numbers.some(n => isNaN(n) || n < 1 || n > 50)) {
    return null;
  }
  if (stars.some(s => isNaN(s) || s < 1 || s > 12)) {
    return null;
  }

  // Vérifier les doublons dans les numéros
  if (new Set(numbers).size !== 5) {
    return null;
  }
  if (new Set(stars).size !== 2) {
    return null;
  }

  return {
    date,
    numbers: numbers.sort((a, b) => a - b),
    stars: stars.sort((a, b) => a - b)
  };
}

/**
 * Parse un fichier CSV complet
 */
export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const draws = [];
  let errors = 0;

  // Ignorer l'en-tête si présent
  let startIndex = 0;
  if (lines[0] && (lines[0].includes('date') || lines[0].includes('Date'))) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const draw = parseCSVLine(lines[i]);
    if (draw) {
      draws.push(draw);
    } else {
      errors++;
    }
  }

  return {
    draws,
    total: lines.length - startIndex,
    valid: draws.length,
    errors
  };
}

/**
 * Parse un fichier texte avec format alternatif
 * Format : Date: DD/MM/YYYY - Nums: 1 2 3 4 5 - Stars: 1 2
 */
export function parseTextFile(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const draws = [];
  let errors = 0;

  for (const line of lines) {
    try {
      // Pattern pour différents formats
      const dateMatch = line.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
      const numsMatch = line.match(/nums?[:\s]+([\d\s]+)/i) || line.match(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      const starsMatch = line.match(/stars?[:\s]+([\d\s]+)/i) || line.match(/(\d+)\s+(\d+)(?:\s|$)/);

      if (!dateMatch || !numsMatch || !starsMatch) {
        errors++;
        continue;
      }

      const date = dateMatch[1];
      const numbers = numsMatch.slice(1, 6).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      const stars = starsMatch.slice(1, 3).map(s => parseInt(s.trim())).filter(s => !isNaN(s));

      if (numbers.length === 5 && stars.length === 2) {
        // Validation
        if (numbers.every(n => n >= 1 && n <= 50) && stars.every(s => s >= 1 && s <= 12)) {
          if (new Set(numbers).size === 5 && new Set(stars).size === 2) {
            draws.push({
              date,
              numbers: numbers.sort((a, b) => a - b),
              stars: stars.sort((a, b) => a - b)
            });
            continue;
          }
        }
      }
      errors++;
    } catch (e) {
      errors++;
    }
  }

  return {
    draws,
    total: lines.length,
    valid: draws.length,
    errors
  };
}

/**
 * Fonction principale pour parser un fichier
 */
export async function parseFile(file) {
  const text = await file.text();
  
  // Détecter le format
  if (file.name.endsWith('.csv') || text.includes(',') || text.includes(';')) {
    return parseCSV(text);
  } else {
    return parseTextFile(text);
  }
}
