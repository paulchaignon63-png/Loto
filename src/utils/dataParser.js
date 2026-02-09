/**
 * Parser pour les fichiers CSV d'historique EuroMillions
 */

/**
 * Parse une ligne CSV et retourne un objet tirage
 * Formats FDJ :
 * - Récent (2020+) : date=2, boules=5-9, étoiles=10-11
 * - Ancien (2011-2016) : date=2, boules=4-8, étoiles=9-10
 */
function parseCSVLine(line, isFDJFormat = false, fdjLayout = 'new') {
  // Ignorer les lignes vides
  if (!line || line.trim().length === 0) {
    return null;
  }

  const separator = isFDJFormat ? ';' : (line.includes(';') ? ';' : ',');
  let parts = line.split(separator).map(p => p.trim()).filter(p => p.length > 0);

  let date, numbers, stars;

  if (isFDJFormat && (parts.length >= 12 || (fdjLayout === 'old' && parts.length >= 11))) {
    date = parts[2];
    
    // Layout "old" (52/55 col.) : boules 4-8, étoiles 9-10
    // Layout "new" (55+ col.) : boules 5-9, étoiles 10-11
    const bouleStart = fdjLayout === 'old' ? 4 : 5;
    const etoileStart = fdjLayout === 'old' ? 9 : 10;
    
    try {
      numbers = [
        parseInt(parts[bouleStart], 10),
        parseInt(parts[bouleStart + 1], 10),
        parseInt(parts[bouleStart + 2], 10),
        parseInt(parts[bouleStart + 3], 10),
        parseInt(parts[bouleStart + 4], 10)
      ];
      stars = [
        parseInt(parts[etoileStart], 10),
        parseInt(parts[etoileStart + 1], 10)
      ];
      if (numbers.some(n => isNaN(n) || n < 1 || n > 50)) return null;
      if (stars.some(s => isNaN(s) || s < 1 || s > 12)) return null;
    } catch (e) {
      return null;
    }
  } else if (!isFDJFormat && parts.length >= 8) {
    // Format simple : date, num1, num2, num3, num4, num5, star1, star2
    try {
      date = parts[0];
      numbers = [
        parseInt(parts[1], 10),
        parseInt(parts[2], 10),
        parseInt(parts[3], 10),
        parseInt(parts[4], 10),
        parseInt(parts[5], 10)
      ];
      stars = [
        parseInt(parts[6], 10),
        parseInt(parts[7], 10)
      ];
    } catch (e) {
      return null;
    }
  } else {
    return null;
  }

  // Validation finale des numéros (double vérification)
  if (numbers.some(n => isNaN(n) || n < 1 || n > 50)) {
    return null;
  }
  
  // Validation finale des étoiles
  if (stars.some(s => isNaN(s) || s < 1 || s > 12)) {
    return null;
  }

  // Vérifier les doublons dans les numéros
  if (new Set(numbers).size !== 5) {
    return null;
  }
  
  // Vérifier les doublons dans les étoiles
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

  // Détecter le format FDJ (présence de "boule_1" ou "date_de_tirage" dans l'en-tête)
  const firstLine = lines[0] || '';
  const isFDJFormat = firstLine.includes('boule_1') || 
                      firstLine.includes('date_de_tirage') ||
                      firstLine.includes('etoile_1') ||
                      firstLine.includes('annee_numero_de_tirage');
  
  console.log('Format détecté:', isFDJFormat ? 'FDJ' : 'Simple', '| Lignes totales:', lines.length);

  // Ignorer l'en-tête si présent
  let startIndex = 0;
  if (lines[0] && (
    lines[0].includes('date') || 
    lines[0].includes('Date') ||
    isFDJFormat
  )) {
    startIndex = 1;
  }

  // Détecter le layout FDJ (ancien vs récent) à partir de la première ligne de données
  let fdjLayout = 'new';
  if (isFDJFormat && lines.length > startIndex) {
    const firstDataParts = lines[startIndex].split(';').map(p => p.trim()).filter(p => p.length > 0);
    const part4 = parseInt(firstDataParts[4], 10);
    const part5 = parseInt(firstDataParts[5], 10);
    // Si parts[4] est un nombre 1-50, c'est le format ancien (boules à 4-8)
    if (!isNaN(part4) && part4 >= 1 && part4 <= 50 && !isNaN(part5) && part5 >= 1 && part5 <= 50) {
      fdjLayout = 'old';
    }
    console.log('Layout FDJ détecté:', fdjLayout);
  }

  for (let i = startIndex; i < lines.length; i++) {
    let draw = parseCSVLine(lines[i], isFDJFormat, fdjLayout);
    // Si format FDJ et échec, réessayer avec l'autre layout (fichiers avec lignes mixtes)
    if (!draw && isFDJFormat) {
      draw = parseCSVLine(lines[i], isFDJFormat, fdjLayout === 'old' ? 'new' : 'old');
    }
    if (draw) {
      // Normaliser la date au format JJ/MM/AAAA si c'est YYYYMMDD
      if (draw.date && /^\d{8}$/.test(draw.date)) {
        const d = draw.date;
        draw.date = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
      }
      draws.push(draw);
    } else {
      errors++;
      if (errors <= 3 && i < startIndex + 5) {
        const parts = lines[i].split(isFDJFormat ? ';' : ',').map(p => p.trim());
        console.warn(`Ligne ${i + 1} ignorée:`, { nbParts: parts.length, partsRelevant: parts.slice(2, 12) });
      }
    }
  }

  console.log(`Parsing terminé: ${draws.length} tirages valides, ${errors} erreurs`);
  
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
  console.log('Lecture du fichier:', file.name, file.type, file.size);
  
  let text;
  try {
    // Essayer de lire avec différents encodages
    text = await file.text();
    console.log('Fichier lu, longueur:', text.length, 'caractères');
    console.log('Premières lignes:', text.split('\n').slice(0, 3));
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    throw new Error(`Impossible de lire le fichier: ${error.message}`);
  }
  
  // Détecter le format
  if (file.name.endsWith('.csv') || text.includes(',') || text.includes(';')) {
    return parseCSV(text);
  } else {
    return parseTextFile(text);
  }
}
