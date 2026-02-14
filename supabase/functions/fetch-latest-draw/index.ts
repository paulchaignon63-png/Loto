import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TAG = 'eu_euromillions';
// Utiliser l’API de production : alpha-api.lotteryresultsapi.com ne résout plus (DNS).
const BASE_URL = 'https://api.lotteryresultsapi.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-cron-secret',
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function parseDraw(apiDraw: { date: string; numbers: Array<{ special: boolean; value: number }> } | null) {
  if (!apiDraw?.date || !Array.isArray(apiDraw.numbers)) return null;
  const numbers = apiDraw.numbers.filter((n) => !n.special).map((n) => n.value).sort((a, b) => a - b);
  const stars = apiDraw.numbers.filter((n) => n.special).map((n) => n.value).sort((a, b) => a - b);
  if (numbers.length !== 5 || stars.length !== 2) return null;
  const [y, m, d] = apiDraw.date.split('-');
  const dateDDMMYYYY = `${d}/${m}/${y}`;
  return { date: dateDDMMYYYY, numbers, stars };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // CRON_SECRET optionnel : si défini ET fourni dans le header, on le vérifie (appel cron).
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret');
    if (provided && provided !== cronSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const apiKey = Deno.env.get('LOTTERY_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'LOTTERY_API_KEY not configured' }, 500);
  }

  try {
    // API v1.1.0 : /lottery/{tag}/draw/latest (réponse { draw: { date, numbers } })
    const res = await fetch(`${BASE_URL}/lottery/${TAG}/draw/latest`, {
      headers: { 'X-API-Token': apiKey },
    });
    if (!res.ok) {
      return jsonResponse({ error: `Lottery API error: ${res.status}` }, 502);
    }
    const data = await res.json();
    const apiDraw = data?.draw ?? data;
    const draw = parseDraw(apiDraw);
    if (!draw) {
      return jsonResponse({ error: 'Invalid API response' }, 502);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase.from('euromillions_draws').upsert(
      { date: draw.date, numbers: draw.numbers, stars: draw.stars },
      { onConflict: 'date,numbers', ignoreDuplicates: true }
    );

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ ok: true, date: draw.date }, 200);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
