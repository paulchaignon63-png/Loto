#!/usr/bin/env node
/**
 * Script d'import des tirages CSV vers Supabase (table euromillions_draws).
 * Utilise SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_URL en fallback).
 *
 * Usage: node scripts/import-draws-to-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Charger .env depuis la racine du projet
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
} catch (_) {}
import { parseCSV } from '../src/utils/dataParser.js';
const DATA_DIR = join(__dirname, '..', 'data');

const CSV_FILES = [
  'euromillions.csv',
  'euromillions_2.csv',
  'euromillions_3.csv',
  'euromillions_4.csv',
  'euromillions_201902.csv',
  'euromillions_202002.csv'
];

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis.');
  console.error('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-draws-to-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

// Dédoublonnage par (date, numbers)
function dedupe(draws) {
  const seen = new Set();
  return draws.filter(d => {
    const key = `${d.date}|${JSON.stringify(d.numbers)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const allDraws = [];

  for (const file of CSV_FILES) {
    const path = join(DATA_DIR, file);
    try {
      const text = readFileSync(path, 'utf-8');
      const { draws } = parseCSV(text);
      allDraws.push(...draws);
      console.log(`  ${file}: ${draws.length} tirages`);
    } catch (e) {
      console.warn(`  ${file}: ignoré (${e.message})`);
    }
  }

  const unique = dedupe(allDraws);
  console.log(`\nTotal: ${allDraws.length} tirages, ${unique.length} uniques après dédoublonnage`);

  if (unique.length === 0) {
    console.error('Aucun tirage à importer.');
    process.exit(1);
  }

  // Insert par lots (Supabase limite à 1000 lignes par requête)
  const BATCH = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH).map(d => ({
      date: d.date,
      numbers: d.numbers,
      stars: d.stars
    }));

    const { data, error } = await supabase
      .from('euromillions_draws')
      .upsert(batch, { onConflict: 'date,numbers', ignoreDuplicates: true });

    if (error) {
      console.error(`Erreur batch ${i / BATCH + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  Importé ${Math.min(i + BATCH, unique.length)} / ${unique.length}`);
    }
  }

  console.log(`\nTerminé: ${inserted} tirages importés${errors ? `, ${errors} erreurs` : ''}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
