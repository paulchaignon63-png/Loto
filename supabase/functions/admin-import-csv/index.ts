import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');
const ADMIN_IMPORT_SECRET = Deno.env.get('ADMIN_IMPORT_SECRET');

// Parser CSV FDJ simplifié (même logique que dataParser.js)
function parseCSVLine(line: string, isFDJ: boolean, fdjLayout: 'old' | 'new'): { date: string; numbers: number[]; stars: number[] } | null {
  if (!line?.trim()) return null;
  const sep = isFDJ ? ';' : line.includes(';') ? ';' : ',';
  const parts = line.split(sep).map((p) => p.trim()).filter((p) => p.length > 0);

  let date: string, numbers: number[], stars: number[];

  if (isFDJ && (parts.length >= 12 || (fdjLayout === 'old' && parts.length >= 11))) {
    date = parts[2];
    const bouleStart = fdjLayout === 'old' ? 4 : 5;
    const etoileStart = fdjLayout === 'old' ? 9 : 10;
    try {
      numbers = [
        parseInt(parts[bouleStart], 10),
        parseInt(parts[bouleStart + 1], 10),
        parseInt(parts[bouleStart + 2], 10),
        parseInt(parts[bouleStart + 3], 10),
        parseInt(parts[bouleStart + 4], 10),
      ];
      stars = [parseInt(parts[etoileStart], 10), parseInt(parts[etoileStart + 1], 10)];
      if (numbers.some((n) => isNaN(n) || n < 1 || n > 50)) return null;
      if (stars.some((s) => isNaN(s) || s < 1 || s > 12)) return null;
    } catch {
      return null;
    }
  } else if (!isFDJ && parts.length >= 8) {
    try {
      date = parts[0];
      numbers = [parseInt(parts[1], 10), parseInt(parts[2], 10), parseInt(parts[3], 10), parseInt(parts[4], 10), parseInt(parts[5], 10)];
      stars = [parseInt(parts[6], 10), parseInt(parts[7], 10)];
    } catch {
      return null;
    }
  } else {
    return null;
  }

  if (numbers.some((n) => isNaN(n) || n < 1 || n > 50) || stars.some((s) => isNaN(s) || s < 1 || s > 12)) return null;
  if (new Set(numbers).size !== 5 || new Set(stars).size !== 2) return null;

  numbers.sort((a, b) => a - b);
  stars.sort((a, b) => a - b);

  if (date && /^\d{8}$/.test(date)) {
    const d = date;
    date = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
  }
  return { date, numbers, stars };
}

function parseCSV(text: string): { date: string; numbers: number[]; stars: number[] }[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const draws: { date: string; numbers: number[]; stars: number[] }[] = [];
  const firstLine = lines[0] || '';
  const isFDJ = firstLine.includes('boule_1') || firstLine.includes('date_de_tirage') || firstLine.includes('etoile_1');
  let startIndex = 0;
  if (lines[0] && (lines[0].includes('date') || lines[0].includes('Date') || isFDJ)) startIndex = 1;

  let fdjLayout: 'old' | 'new' = 'new';
  if (isFDJ && lines.length > startIndex) {
    const parts = lines[startIndex].split(';').map((p) => p.trim()).filter((p) => p.length > 0);
    const p4 = parseInt(parts[4], 10);
    const p5 = parseInt(parts[5], 10);
    if (!isNaN(p4) && p4 >= 1 && p4 <= 50 && !isNaN(p5) && p5 >= 1 && p5 <= 50) fdjLayout = 'old';
  }

  for (let i = startIndex; i < lines.length; i++) {
    let draw = parseCSVLine(lines[i], isFDJ, fdjLayout);
    if (!draw && isFDJ) draw = parseCSVLine(lines[i], isFDJ, fdjLayout === 'old' ? 'new' : 'old');
    if (draw) draws.push(draw);
  }
  return draws;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
};

function jsonResponse(body: unknown, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...headers },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized: missing Bearer token' }, 401);
  }

  let body: { csv?: string; adminSecret?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const jwt = authHeader.replace('Bearer ', '');
  let isAnon = false;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1] || '{}'));
    isAnon = payload?.role === 'anon';
  } catch {
    /* ignore */
  }
  const useSecretAuth = isAnon && ADMIN_IMPORT_SECRET && body.adminSecret === ADMIN_IMPORT_SECRET;
  if (!useSecretAuth) {
    if (isAnon) {
      return jsonResponse(
        { error: 'Unauthorized: use admin secret or sign in with admin email' },
        401
      );
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user?.email) {
      return jsonResponse(
        { error: 'Unauthorized: invalid or expired token', detail: authError?.message },
        401
      );
    }
    if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403);
    }
  }

  const csv = body?.csv;
  if (typeof csv !== 'string' || !csv.trim()) {
    return jsonResponse({ error: 'CSV content required' }, 400);
  }

  const draws = parseCSV(csv);
  if (draws.length === 0) {
    return jsonResponse({ error: 'No valid draws found', added: 0, duplicates: 0 }, 400);
  }

  const rows = draws.map((d) => ({ date: d.date, numbers: d.numbers, stars: d.stars }));
  const { data: inserted, error } = await supabase
    .from('euromillions_draws')
    .upsert(rows, { onConflict: 'date,numbers', ignoreDuplicates: true })
    .select('id');

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const added = Array.isArray(inserted) ? inserted.length : 0;
  const duplicates = draws.length - added;

  return jsonResponse({ ok: true, added, duplicates, total: draws.length }, 200);
});
